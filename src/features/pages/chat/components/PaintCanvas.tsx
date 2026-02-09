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
  exportImageBlob: () => Promise<Blob | null>; // 画像 (WebP)
  exportJson: () => string;
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
  // 1. Contextから saveStroke を取得
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
    //線を引く
    drawStroke: actions.addStroke,
    //キャンバスリセット
    resetCanvas: actions.resetCanvas,

    //webpの書き出し(サムネ用)
    exportImageBlob: async () => {
      const stage = stageRef.current;
      if (!stage) return null;

      return new Promise((resolve) => {
        stage.toBlob({
          mimeType: "image/webp", // 軽くて綺麗
          quality: 0.5, // 画質
          pixelRatio: 1, // 1倍 (高画質保存なら2にする)
          callback: (blob) => resolve(blob),
        });
      });
    },

    // JSON書き出し
    exportJson: () => {
      // useKonva から lines (Stroke配列) を受け取っている前提
      // もし受け取ってなければ useKonva の return に lines を追加してください
      return JSON.stringify(lines);
    },

    //現在のストローク数
    getStrokeCount: () => lines.length,
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
      <Layer
        clipX={0}
        clipY={0}
        clipWidth={CANVAS_WIDTH}
        clipHeight={CANVAS_HEIGHT}
      >
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
        {LAYER_RENDER_ORDER.map((layerId) => {
          const layerLines = lines.filter((l) => {
            if (layerId === 1) {
              return l.layerId === 1 || !l.layerId;
            }
            return l.layerId === layerId;
          });

          const isDrawingOnThisLayer =
            activeLayer === layerId && currentPoints.length > 0;

          return (
            <Group key={layerId}>
              {layerLines.map((line) => (
                <Line
                  key={line.id}
                  points={line.points}
                  strokeWidth={line.width}
                  stroke={line.tool === "eraser" ? "white" : line.color}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  hitStrokeWidth={20}
                />
              ))}

              {isDrawingOnThisLayer && (
                <Line
                  points={currentPoints}
                  stroke={toolMode === "eraser" ? "white" : strokeColor}
                  strokeWidth={strokeWidth}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                />
              )}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
};

PaintCanvas.displayName = "PaintCanvas";
