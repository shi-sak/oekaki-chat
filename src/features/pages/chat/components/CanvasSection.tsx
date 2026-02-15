"use client";

import { RefObject, useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Minus, RotateCcw } from "lucide-react"; 

import type { PaintCanvasHandle } from "./PaintCanvas";
// SSR無効化
const PaintCanvas = dynamic(
  () => import("./PaintCanvas").then((mod) => mod.PaintCanvas),
  {
    ssr: false,
    loading: () => <div className="h-[600px] bg-gray-200 animate-pulse" />,
  },
);

import { ToolBox } from "../components/ToolBox";
import { Room } from "../actions/useChatRoom";
import { ToolMode } from "@/constants/canvas";

type Props = {
  canvasHandleRef: RefObject<PaintCanvasHandle | null>;
  roomInfo: Room | null;
};

export const CanvasSection = ({ canvasHandleRef, roomInfo }: Props) => {
  const isActive = roomInfo?.is_active;

  const [color, setColor] = useState("#18181b");
  const [toolMode, setToolMode] = useState<ToolMode>("pen");
  const [penWidth, setPenWidth] = useState(4);
  const [eraserWidth, setEraserWidth] = useState(20);
  const currentWidth = toolMode === "eraser" ? eraserWidth : penWidth;
  const [activeLayer, setActiveLayer] = useState(1);

  const handleWidthChange = (newWidth: number) => {
    if (toolMode === "eraser") {
      setEraserWidth(newWidth);
    } else {
      setPenWidth(newWidth);
    }
  };

  const handleColorPick = (pickedColor: string) => {
    setColor(pickedColor);
    setToolMode("pen");
  };

  // ★ ズーム操作用の関数
  const handleZoomIn = () => canvasHandleRef.current?.zoomIn();
  const handleZoomOut = () => canvasHandleRef.current?.zoomOut();
  const handleResetView = () => canvasHandleRef.current?.resetView();

  return (
    <div className="flex-1 flex flex-col gap-4 relative">
      <div className="relative border-4 border-gray-800 rounded-xl overflow-hidden shadow-lg bg-gray-200 h-[600px] w-full group">
        
        {isActive && (
          <>
            {/* 左上: ツールボックス */}
            <ToolBox
              className="absolute top-4 left-4 z-10"
              currentColor={color}
              currentWidth={currentWidth}
              toolMode={toolMode}
              onColorChange={setColor}
              onWidthChange={handleWidthChange}
              onToolChange={setToolMode}
              activeLayer={activeLayer}
              onLayerChange={setActiveLayer}
            />

            {/* ★ 右上: ズームコントローラー */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <button
                onClick={handleZoomIn}
                className="bg-white/90 backdrop-blur p-2 rounded-lg border-2 border-gray-800 shadow-md hover:bg-gray-100 transition-all text-gray-700"
                title="Zoom In"
              >
                <Plus size={20} />
              </button>
              <button
                onClick={handleResetView}
                className="bg-white/90 backdrop-blur p-2 rounded-lg border-2 border-gray-800 shadow-md hover:bg-gray-100 transition-all text-gray-700 font-bold text-xs"
                title="Reset View"
              >
                <RotateCcw size={20} />
              </button>
              <button
                onClick={handleZoomOut}
                className="bg-white/90 backdrop-blur p-2 rounded-lg border-2 border-gray-800 shadow-md hover:bg-gray-100 transition-all text-gray-700"
                title="Zoom Out"
              >
                <Minus size={20} />
              </button>
            </div>
          </>
        )}

        <div className="w-full h-full bg-gray-200 cursor-crosshair">
          <PaintCanvas
            ref={canvasHandleRef}
            onColorPick={handleColorPick}
            disabled={!isActive}
            strokeColor={color}
            strokeWidth={currentWidth}
            toolMode={toolMode}
            activeLayer={activeLayer}
          />
        </div>

        {!isActive && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
            <p className="bg-white px-8 py-4 rounded border-2 border-gray-800 font-bold text-gray-800 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              スタートボタンを押すと開始します。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};