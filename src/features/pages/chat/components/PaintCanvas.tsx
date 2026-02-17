"use client";

import { useImperativeHandle, Ref, useRef } from "react";
import { Stage, Layer, Line, Rect, Group } from "react-konva";
import Konva from "konva";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAYER_RENDER_ORDER,
  CommonCanvasProps,
} from "@/constants/canvas";
import { useKonva } from "@/features/pages/chat/actions/useKonva";
import { useRoomContext } from "../contexts/RoomContext";

// ★ 1ブロックあたりの線の数 (50本ごとに画像化して固める)
const CHUNK_SIZE = 50;

export interface PaintCanvasHandle {
  drawStroke: (stroke: any) => void;
  resetCanvas: () => void;
  exportImageBlob: (type?: "png" | "webp") => Promise<Blob | null>;
  getStrokeCount: () => number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

type Props = Omit<CommonCanvasProps, "onSaveStroke"> & {
  ref?: Ref<PaintCanvasHandle>;
};

export const PaintCanvas = ({
  ref,
  onColorPick,
  strokeColor,
  strokeWidth,
  toolMode,
  activeLayer,
  disabled = false,
}: Props) => {
  const { onSaveStroke } = useRoomContext();
  const isDrawingRef = useRef(false);

  const {
    stageRef,
    lines,
    currentPoints,
    stageScale,
    stagePos,
    handlers,
    actions,
  } = useKonva({
    onSaveStroke: onSaveStroke,
    onColorPick,
    strokeColor,
    strokeWidth,
    toolMode,
    activeLayer,
    disabled,
  });

  // ズームやスクロールをしていても、正確に色を拾う関数
  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const handleMouseDownWrapped = (e: any) => {
    // ■ スポイト処理 (ズーム対応版)
    if (toolMode === "pipette") {
      const stage = stageRef.current;
      if (!stage) return;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // 画面上の座標を、キャンバス内の絶対座標に変換
      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const pos = transform.point(pointerPos);

      // その1ピクセルだけを切り出して色を取得
      const pixelCanvas = stage.toCanvas({
        x: pos.x,
        y: pos.y,
        width: 1,
        height: 1,
        pixelRatio: 1,
      });

      const ctx = pixelCanvas.getContext("2d");
      if (ctx) {
        const p = ctx.getImageData(0, 0, 1, 1).data;
        const hex = rgbToHex(p[0], p[1], p[2]);
        onColorPick?.(hex);
      }
      return;
    }

    isDrawingRef.current = true;
    handlers.handleMouseDown(e);
  };

  const handleMouseUpWrapped = () => {
    isDrawingRef.current = false;
    handlers.handleMouseUp();
  };

  useImperativeHandle(ref, () => ({
    drawStroke: actions.addStroke,
    resetCanvas: actions.resetCanvas,
    getStrokeCount: () => lines.length,
    zoomIn: actions.zoomIn,
    zoomOut: actions.zoomOut,
    resetView: actions.resetView,

    exportImageBlob: async (type: "png" | "webp" = "webp") => {
      while (isDrawingRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const stage = stageRef.current;
      if (!stage) return null;

      // 状態退避
      const oldScale = stage.scaleX();
      const oldPos = stage.position();
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });

      // 書き出し用の高画質化は、今のチャンク構造なら「特に何もしなくても」
      // Konvaが勝手にやってくれるので、キャッシュ解除ループは不要です！

      const TARGET_WIDTH = 300;
      const ratio = TARGET_WIDTH / CANVAS_WIDTH;
      const pixelRatio = type === "png" ? 1 : ratio;

      const tempCanvas = stage.toCanvas({
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pixelRatio,
      });

      // 復帰
      stage.scale({ x: oldScale, y: oldScale });
      stage.position(oldPos);

      return new Promise((resolve) => {
        tempCanvas.toBlob(
          (blob) => resolve(blob),
          type === "png" ? "image/png" : "image/webp",
          type === "png" ? 1 : 0.6,
        );
      });
    },
  }));

  const CIRCLE_CURSOR = `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='7' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='%23ffffff' stroke='%23000000' stroke-width='2'/%3E%3C/svg%3E") 12 12, crosshair`;

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth}
      height={600}
      draggable={toolMode === "hand"}
      onWheel={handlers.handleWheel}
      scaleX={stageScale}
      scaleY={stageScale}
      x={stagePos.x}
      y={stagePos.y}
      onMouseDown={handleMouseDownWrapped}
      onMouseMove={handlers.handleMouseMove}
      onMouseUp={handleMouseUpWrapped}
      onTouchStart={handleMouseDownWrapped}
      onTouchMove={handlers.handleMouseMove}
      onTouchEnd={handleMouseUpWrapped}
      style={{
        background: "#e5e7eb",
        cursor: toolMode === "hand" ? "grab" : CIRCLE_CURSOR,
        touchAction: "none",
      }}
    >
      <Layer>
        <Rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          fill="white"
          shadowBlur={20}
          shadowColor="black"
          shadowOpacity={0.1}
        />
      </Layer>

      {LAYER_RENDER_ORDER.map((layerId) => {
        // 1. このレイヤーの全線を取得
        const layerLines = lines.filter((l) => {
          if (layerId === 1) return l.layerId === 1 || !l.layerId;
          return l.layerId === layerId;
        });

        // 2. 線を「チャンク(50本の束)」に分割する
        // 例: 120本 -> [50本, 50本, 20本] の3つのグループになる
        const chunks = [];
        for (let i = 0; i < layerLines.length; i += CHUNK_SIZE) {
          chunks.push(layerLines.slice(i, i + CHUNK_SIZE));
        }

        const isDrawingOnThisLayer =
          activeLayer === layerId && currentPoints.length > 0;

        return (
          <Layer
            key={layerId}
            clipX={0}
            clipY={0}
            clipWidth={CANVAS_WIDTH}
            clipHeight={CANVAS_HEIGHT}
          >
            {/* ■ チャンクごとの描画 */}
            {chunks.map((chunkLines, i) => {
              const isLastChunk = i === chunks.length - 1;

              return (
                <Group
                  key={i}
                  ref={(node) => {
                    // ★ 最後のチャンク以外は「即キャッシュ」して固定！
                    // isLastChunk が false になった瞬間（次の束ができた瞬間）に
                    // 自動的にキャッシュされるので、useEffect等の管理は不要です。
                    if (node && !isLastChunk) {
                      // まだキャッシュされてない時だけ実行
                      if (!node.isCached()) {
                        node.cache({
                          pixelRatio: 3, // iPad用高画質
                          x: 0,
                          y: 0,
                          width: CANVAS_WIDTH,
                          height: CANVAS_HEIGHT,
                        });
                      }
                    }
                  }}
                >
                  {chunkLines.map((line) => (
                    <Line
                      key={line.id}
                      points={line.points}
                      strokeWidth={line.width}
                      stroke={line.tool === "eraser" ? "black" : line.color}
                      globalCompositeOperation={
                        line.tool === "eraser"
                          ? "destination-out"
                          : "source-over"
                      }
                      tension={0.5}
                      lineCap="round"
                      lineJoin="round"
                    />
                  ))}
                </Group>
              );
            })}

            {/* ■ 今描いている最中の線 (常に最前面) */}
            {isDrawingOnThisLayer && (
              <Line
                points={currentPoints}
                stroke={toolMode === "eraser" ? "black" : strokeColor}
                strokeWidth={strokeWidth}
                globalCompositeOperation={
                  toolMode === "eraser" ? "destination-out" : "source-over"
                }
                tension={0.5}
                lineCap="round"
                lineJoin="round"
              />
            )}
          </Layer>
        );
      })}
    </Stage>
  );
};

PaintCanvas.displayName = "PaintCanvas";