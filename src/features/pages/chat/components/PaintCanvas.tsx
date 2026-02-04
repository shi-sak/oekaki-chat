"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  ReactSketchCanvas,
  ReactSketchCanvasRef,
  CanvasPath,
} from "react-sketch-canvas";

interface PaintCanvasProps {
  onStroke: (stroke: CanvasPath) => void;
}

// 親から使える関数を定義
export interface PaintCanvasHandle {
  drawStroke: (stroke: CanvasPath) => void;
  resetCanvas: () => void;
}

export const PaintCanvas = forwardRef<PaintCanvasHandle, PaintCanvasProps>(
  ({ onStroke }, ref) => {
    const canvasRef = useRef<ReactSketchCanvasRef>(null);

    // 親コンポーネントに公開する関数
    useImperativeHandle(ref, () => ({
      drawStroke: (stroke: CanvasPath) => {
        // 自分の線じゃなければ描画する
        canvasRef.current?.loadPaths([stroke]);
      },
      resetCanvas: () => {
        canvasRef.current?.clearCanvas();
      },
    }));

    return (
      <ReactSketchCanvas
        ref={canvasRef}
        strokeWidth={4}
        strokeColor="black"
        onStroke={(stroke) => {
          // 線を引き終わったら親にデータを渡す
          onStroke(stroke);
        }}
        style={{ border: "none", width: "100%", height: "500px" }}
      />
    );
  },
);

PaintCanvas.displayName = "PaintCanvas";
