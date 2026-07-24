"use client";

import { useImperativeHandle, Ref, useRef, useEffect } from "react";
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

const CHUNK_SIZE = 50; // ★ 50本たまったら一気にキャッシュを更新する

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

  const layerRefs = useRef<Map<number, Konva.Layer>>(new Map());
  const staticGroupRefs = useRef<Map<number, Konva.Group>>(new Map());
  // ★ 各レイヤーが「何本目までキャッシュしたか」を記憶するRef
  const cachedCountsRef = useRef<Map<number, number>>(new Map());

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

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // ■ かしこいキャッシュ管理エフェクト
  useEffect(() => {
    LAYER_RENDER_ORDER.forEach((layerId) => {
      const layerLines = lines.filter((l) => {
        if (layerId === 1) return l.layerId === 1 || !l.layerId;
        return l.layerId === layerId;
      });

      // 現在の線から、「50の倍数」になるように計算する
      // 例: 123本なら -> 100本が静的(キャッシュ)に回る
      const staticCount = Math.floor(layerLines.length / CHUNK_SIZE) * CHUNK_SIZE;
      const lastCachedCount = cachedCountsRef.current.get(layerId) || 0;

      // ★ 50の倍数をまたいだ瞬間（キャッシュすべき線が増えた時）だけ更新！
      if (staticCount > 0 && staticCount > lastCachedCount) {
        const group = staticGroupRefs.current.get(layerId);
        if (group) {
          // 1. まず即座にキャッシュを剥がしてチラつきを防ぐ
          group.clearCache();
          
          // 2. ほんの少し待ってから再キャッシュ
          setTimeout(() => {
            try {
              group.cache({
                pixelRatio: 3,
                x: 0,
                y: 0,
                width: CANVAS_WIDTH,
                height: CANVAS_HEIGHT,
              });
              // キャッシュ完了した本数を記録
              cachedCountsRef.current.set(layerId, staticCount);
            } catch (e) {}
          }, 50);
        }
      }
    });
  }, [lines]);


  const handleMouseDownWrapped = (e: any) => {
    if (toolMode === "pipette") {
      const stage = stageRef.current;
      if (!stage) return;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const transform = stage.getAbsoluteTransform().copy();
      transform.invert();
      const pos = transform.point(pointerPos);

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

      const oldScale = stage.scaleX();
      const oldPos = stage.position();
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });

      // 書き出し前はキャッシュを剥がす
      staticGroupRefs.current.forEach((group) => group.clearCache());

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

      stage.scale({ x: oldScale, y: oldScale });
      stage.position(oldPos);

      // 終わったら戻す
      staticGroupRefs.current.forEach((group) => {
        try {
          group.cache({ pixelRatio: 3, x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
        } catch (e) {}
      });

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
        const layerLines = lines.filter((l) => {
          if (layerId === 1) return l.layerId === 1 || !l.layerId;
          return l.layerId === layerId;
        });

        // ★ 50の倍数で分割！
        const staticCount = Math.floor(layerLines.length / CHUNK_SIZE) * CHUNK_SIZE;
        const staticLines = layerLines.slice(0, staticCount);
        const dynamicLines = layerLines.slice(staticCount);

        const isDrawingOnThisLayer =
          activeLayer === layerId && currentPoints.length > 0;

        return (
          <Layer
            key={layerId}
            ref={(node) => {
              if (node) layerRefs.current.set(layerId, node);
            }}
            clipX={0}
            clipY={0}
            clipWidth={CANVAS_WIDTH}
            clipHeight={CANVAS_HEIGHT}
          >
            {/* ■ 静的グループ (1つの巨大グループに戻す！) */}
            <Group
              ref={(node) => {
                if (node) {
                  staticGroupRefs.current.set(layerId, node);
                }
              }}
            >
              {staticLines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  strokeWidth={line.width}
                  stroke={line.tool === "eraser" ? "black" : line.color}
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}
            </Group>

            {/* ■ 動的グループ (最大50本) */}
            <Group>
              {dynamicLines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  strokeWidth={line.width}
                  stroke={line.tool === "eraser" ? "black" : line.color}
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              ))}

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
            </Group>
          </Layer>
        );
      })}
    </Stage>
  );
};

PaintCanvas.displayName = "PaintCanvas";