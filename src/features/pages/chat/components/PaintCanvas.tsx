"use client";

import { useImperativeHandle, useRef } from "react";
import {
  ReactSketchCanvas,
  ReactSketchCanvasRef,
  CanvasPath,
} from "react-sketch-canvas";

export interface PaintCanvasHandle {
  drawStroke: (stroke: CanvasPath) => void;
  resetCanvas: () => void; // 名前も中身も reset に統一！
  exportImage: (imageType: "png" | "jpeg") => Promise<string>;
  exportPaths: () => Promise<CanvasPath[]>;
}

interface PaintCanvasProps {
  onDrawEnd: (stroke: CanvasPath) => void;
  disabled?: boolean;
  ref?: React.Ref<PaintCanvasHandle>;
}

export const PaintCanvas = ({
  onDrawEnd,
  disabled = false,
  ref,
}: PaintCanvasProps) => {
  const canvasHandleRef = useRef<ReactSketchCanvasRef>(null);

  useImperativeHandle(ref, () => ({
    drawStroke: (stroke) => {
      canvasHandleRef.current?.loadPaths([stroke]);
    },
    resetCanvas: () => {
      canvasHandleRef.current?.resetCanvas();
    },
    exportImage: (type) => {
      return (
        canvasHandleRef.current?.exportImage(type) ??
        Promise.reject("Not ready")
      );
    },
    exportPaths: () => {
      return (
        canvasHandleRef.current?.exportPaths() ?? Promise.reject("Not ready")
      );
    },
  }));

  return (
    <ReactSketchCanvas
      ref={canvasHandleRef}
      strokeWidth={4}
      strokeColor="black"
      onStroke={(stroke) => onDrawEnd(stroke)}
      style={{
        border: "none",
        width: "100%",
        height: "500px",
        pointerEvents: disabled ? "none" : "auto",
      }}
    />
  );
};
