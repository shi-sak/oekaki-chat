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

const CACHE_THRESHOLD = 50;

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

  // ■ キャッシュ管理のエフェクト
  useEffect(() => {
    // 1. まずは即座にキャッシュを剥がす！ (これで線が消えるのを防ぐ)
    staticGroupRefs.current.forEach((group) => group.clearCache());

    // 2. 少し待ってからキャッシュし直す (重い処理は遅延させる)
    const timer = setTimeout(() => {
      staticGroupRefs.current.forEach((group) => {
        try {
          // 中身がある場合のみキャッシュ
          group.cache({
            pixelRatio: 3, // iPad用高画質
            x: 0,
            y: 0,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
          });
        } catch (e) {
          // console.error(e); // 空の場合は無視
        }
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [lines]); 

  // ... (useImperativeHandle はそのまま) ...
  useImperativeHandle(ref, () => ({
    drawStroke: actions.addStroke,
    resetCanvas: actions.resetCanvas,
    getStrokeCount: () => lines.length,

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

      staticGroupRefs.current.forEach((group) => group.clearCache());

      const TARGET_WIDTH = 300;
      const ratio = TARGET_WIDTH / CANVAS_WIDTH;

      const tempCanvas = stage.toCanvas({
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pixelRatio: type === "png" ? 1 : ratio,
      });

      stage.scale({ x: oldScale, y: oldScale });
      stage.position(oldPos);

      staticGroupRefs.current.forEach((group) => {
        try {
          group.cache({ pixelRatio: 3, x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
        } catch (e) { }
      });

      return new Promise((resolve) => {
        tempCanvas.toBlob(
          (blob) => resolve(blob),
          type === "png" ? "image/png" : "image/webp",
          type === "png" ? 1 : 0.6,
        );
      });
    },
    zoomIn: actions.zoomIn,
    zoomOut: actions.zoomOut,
    resetView: actions.resetView,
  }));


  const CIRCLE_CURSOR = `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='7' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='%23ffffff' stroke='%23000000' stroke-width='2'/%3E%3C/svg%3E") 12 12, crosshair`;

  const handleMouseDownWrapped = (e: any) => {
    isDrawingRef.current = true;
    handlers.handleMouseDown(e);
  };

  const handleMouseUpWrapped = () => {
    isDrawingRef.current = false;
    handlers.handleMouseUp();
  };

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

        // ★ ここで定数を使う
        const splitIndex = Math.max(0, layerLines.length - CACHE_THRESHOLD);

        const staticLines = layerLines.slice(0, splitIndex);
        const dynamicLines = layerLines.slice(splitIndex);

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
            {/* ■ 静的グループ */}
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

            {/* ■ 動的グループ */}
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