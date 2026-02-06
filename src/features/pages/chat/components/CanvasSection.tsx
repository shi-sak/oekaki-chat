"use client";

import { RefObject, useState } from "react";
import { Download } from "lucide-react";
import { PaintCanvas, PaintCanvasHandle } from "../components/PaintCanvas";
import { ToolBox } from "../components/ToolBox";
import { Room } from "../actions/useChatRoom";
import { Stroke, ToolMode } from "@/constants/canvas"; // ★新しい型定義をimport

type Props = {
  canvasHandleRef: RefObject<PaintCanvasHandle | null>;
  roomInfo: Room | null;
  onStroke: (stroke: Stroke) => void; // ★型をCanvasPathからStrokeに変更
};

export const CanvasSection = ({
  canvasHandleRef,
  roomInfo,
  onStroke,
}: Props) => {
  const isActive = roomInfo?.is_active;

  // ■ ツールの状態管理
  const [color, setColor] = useState("#18181b"); // 初期値: 黒
  const [width, setWidth] = useState(4);
  const [toolMode, setToolMode] = useState<ToolMode>("pen");

  // ★ 変更点1: 太さを別々に管理する
  const [penWidth, setPenWidth] = useState(4); // ペンの初期値
  const [eraserWidth, setEraserWidth] = useState(20); // 消しゴムの初期値（太めが便利！）

  // ★ 変更点2: 現在のモードに合わせて「使う太さ」を決める
  const currentWidth = toolMode === "eraser" ? eraserWidth : penWidth;

  // ★ 変更点3: 太さを変更する関数もモードで分岐させる
  const handleWidthChange = (newWidth: number) => {
    if (toolMode === "eraser") {
      setEraserWidth(newWidth);
    } else {
      setPenWidth(newWidth);
    }
  };

  const handleColorPick = (pickedColor: string) => {
    setColor(pickedColor); // 色を更新
    setToolMode("pen"); // 自動的にペンモードに戻す（これが使いやすい！）
  };

  //初期レイヤー
  const [activeLayer, setActiveLayer] = useState(1);

  return (
    <div className="flex-1 flex flex-col gap-4 relative">
      <div className="relative border-4 border-gray-800 rounded-xl overflow-hidden shadow-lg bg-gray-200 h-[600px] w-full group">
        {isActive && (
          <ToolBox
            className="absolute top-4 left-4 z-10"
            currentColor={color}
            // ▼ モードに応じた太さを渡す
            currentWidth={currentWidth}
            toolMode={toolMode}
            onColorChange={setColor}
            // ▼ モードに応じた更新関数を渡す
            onWidthChange={handleWidthChange}
            onToolChange={setToolMode}
            activeLayer={activeLayer}
            onLayerChange={setActiveLayer}
          />
        )}

        <div className="w-full h-full bg-gray-200 cursor-crosshair">
          <PaintCanvas
            ref={canvasHandleRef}
            onDrawEnd={onStroke}
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
