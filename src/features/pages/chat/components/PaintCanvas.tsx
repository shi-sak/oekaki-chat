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

export interface PaintCanvasHandle {
  drawStroke: (stroke: any) => void;
  resetCanvas: () => void;
  exportImage: () => Promise<string>;
}

type Props = Omit<CommonCanvasProps, "disabled"> & {
  disabled?: boolean;
  ref?: Ref<PaintCanvasHandle>;
};

export const PaintCanvas = ({
  onDrawEnd,
  onColorPick,
  strokeColor,
  strokeWidth,
  toolMode,
  activeLayer,
  disabled = false,
  ref,
}: Props) => {
  const {
    stageRef,
    lines,
    currentPoints,
    stageScale,
    stagePos,
    handlers,
    actions,
  } = useKonva({
    onDrawEnd,
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
    exportImage: actions.exportImage,
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
        {/* 背景の紙 */}
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
          // このレイヤーに属する線だけを抽出
          const layerLines = lines.filter((l) => {
            if (layerId === 1) {
              // レイヤー1は「IDが1」または「古いデータ(undefined)」も含む
              return l.layerId === 1 || !l.layerId;
            }
            return l.layerId === layerId;
          });

          // 今まさにこのレイヤーに描いているか？
          const isDrawingOnThisLayer =
            activeLayer === layerId && currentPoints.length > 0;

          return (
            <Group key={layerId}>
              {/* 1. 確定済みの線 */}
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

              {/* 2. 描画中の線 (このレイヤーがアクティブな時だけ表示) */}
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
