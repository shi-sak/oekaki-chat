"use client";

import { useImperativeHandle, Ref } from "react";
import { Stage, Layer, Line, Rect, Group } from "react-konva";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAYER_RENDER_ORDER,
  CommonCanvasProps,
} from "@/constants/canvas";
import { useKonva } from "@/features/pages/chat/actions/useKonva";
import { useRoomContext } from "../contexts/RoomContext";

export interface PaintCanvasHandle {
  drawStroke: (stroke: any) => void;
  resetCanvas: () => void;
  exportImageBlob: (type?: "png" | "webp") => Promise<Blob | null>;
  getStrokeCount: () => number;
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

  useImperativeHandle(ref, () => ({
    drawStroke: actions.addStroke,
    resetCanvas: actions.resetCanvas,
    getStrokeCount: () => lines.length,

    // ★ 重ね合わせ方式の書き出し
    exportImageBlob: async (type: "png" | "webp" = "webp") => {
      const stage = stageRef.current;
      if (!stage) return null;

      // お絵かきレイヤーを探す
      // (LAYER_RENDER_ORDERを使っている部分のレイヤーです)
      // 構造が変わっていなければ、getChildren() で取得できますが、
      // 確実にするために ref を使うか、今回はシンプルに「一番上のレイヤー」を取得してみます
      const layers = stage.getLayers();

      // 背景レイヤー(0番目) と お絵かきレイヤー(それ以降) があるはずです
      // ここでは「お絵描きレイヤーたち」を対象にします
      const drawingLayers = layers.filter((l) => {
        // 背景用のRectを持っているレイヤーを除外する、等のロジックが必要ですが
        // 今回は単純に「index 0 以外」または「全部重ねる」で考えます
        return true;
      });

      // 1. 合成用のキャンバスを作成 (DOMには追加しない)
      const finalCanvas = document.createElement("canvas");
      // pixelRatioを考慮したサイズにする
      const ratio = type === "png" ? 1 : 1; // 一旦 1倍で固定して試しましょう

      finalCanvas.width = CANVAS_WIDTH * ratio;
      finalCanvas.height = CANVAS_HEIGHT * ratio;

      const ctx = finalCanvas.getContext("2d");
      if (!ctx) return null;

      // 2. まず「白」で塗りつぶす (これが背景になります)
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

      // 3. 各レイヤーを原寸で書き出して重ねる
      for (const layer of layers) {
        // layer.toCanvas は Stageのズームを無視して、定義通りのサイズで出力してくれます
        const layerCanvas = layer.toCanvas({
          x: 0,
          y: 0,
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          pixelRatio: ratio,
        });

        // 白背景の上に描画
        ctx.drawImage(layerCanvas, 0, 0);
      }

      // 4. Blob化
      return new Promise((resolve) => {
        finalCanvas.toBlob(
          (blob) => resolve(blob),
          type === "png" ? "image/png" : "image/webp",
          type === "png" ? 1 : 0.8, // 画質設定
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
      onMouseDown={handlers.handleMouseDown}
      onMouseMove={handlers.handleMouseMove}
      onMouseUp={handlers.handleMouseUp}
      onTouchStart={handlers.handleMouseDown}
      onTouchMove={handlers.handleMouseMove}
      onTouchEnd={handlers.handleMouseUp}
      style={{
        background: "#e5e7eb",
        cursor: toolMode === "hand" ? "grab" : CIRCLE_CURSOR,
        touchAction: "none",
      }}
    >
      {/* ▼ レイヤー0: 背景専用 (独立させる！)
        これが一番下にいるので、上の消しゴムで透けてもここが見える
      */}
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

      {/* ▼ レイヤー1〜N: お絵描きレイヤー (独立させる！)
        ループで <Layer> を個別に生成するのがポイント
      */}
      {LAYER_RENDER_ORDER.map((layerId) => {
        const layerLines = lines.filter((l) => {
          if (layerId === 1) return l.layerId === 1 || !l.layerId;
          return l.layerId === layerId;
        });

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
            <Group>
              {layerLines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  strokeWidth={line.width}
                  stroke={line.tool === "eraser" ? "black" : line.color}
                  // このレイヤー内だけで透明化！下の白背景は無事！
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  hitStrokeWidth={20}
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
