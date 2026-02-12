"use client";

import { useImperativeHandle, Ref, useRef } from "react";
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
  //
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

  useImperativeHandle(ref, () => ({
    drawStroke: actions.addStroke,
    resetCanvas: actions.resetCanvas,
    getStrokeCount: () => lines.length,

    exportImageBlob: async (type: "png" | "webp" = "webp") => {
      //線を引いてる最中なら待つ
      while (isDrawingRef.current) {
        // 100ms 待ってから再チェック (ポーリング)
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const stage = stageRef.current;
      if (!stage) return null;

      // 1. 現在のユーザーのズーム倍率と位置を避難 📝
      const oldScale = stage.scaleX();
      const oldPos = stage.position();

      // 2. 一瞬だけ「初期状態」に戻す 📸
      // ※ユーザーの画面は更新されません (JSがブロックしているため)
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });

      // 3. 同期的に Canvas 要素としてデータを引っこ抜く！
      // toBlob (非同期) ではなく toCanvas (同期) を使うのが最大のキモです
      const tempCanvas = stage.toCanvas({
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pixelRatio: type === "png" ? 2 : 0.5, // 画質調整
      });

      // 4. 即座にユーザーの画面を元に戻す ↩️
      stage.scale({ x: oldScale, y: oldScale });
      stage.position(oldPos);

      // ここで初めて画面の更新(再描画)が走るが、
      // ユーザーから見れば 1 と 4 の状態は同じなので、何も起きていないように見える

      // 5. 抜き取ったCanvasをBlobに変換して返す
      return new Promise((resolve) => {
        tempCanvas.toBlob(
          (blob) => resolve(blob),
          type === "png" ? "image/png" : "image/webp",
          type === "png" ? 1 : 0.8,
        );
      });
    },
  }));

  const CIRCLE_CURSOR = `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='7' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='%23ffffff' stroke='%23000000' stroke-width='2'/%3E%3C/svg%3E") 12 12, crosshair`;

  // ★ 2. イベントハンドラをラップして、フラグをON/OFFする
  const handleMouseDownWrapped = (e: any) => {
    isDrawingRef.current = true; // 描き始めフラグON
    handlers.handleMouseDown(e);
  };

  const handleMouseUpWrapped = () => {
    isDrawingRef.current = false; // 描き終わりフラグOFF
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
                  hitStrokeWidth={Math.max(line.width, 20)}
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
