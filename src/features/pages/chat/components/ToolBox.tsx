"use client";

import {
  Eraser,
  Pen,
  Hand,
  ChevronDown,
  Pipette,
  X,
  Menu,
  Layers,
} from "lucide-react"; // アイコン追加
import { HexColorPicker } from "react-colorful";
import { useState, useRef, useEffect, ComponentProps } from "react";

import { ToolMode, PEN_WIDTH } from "@/constants/canvas";

type ToolBoxProps = ComponentProps<"div"> & {
  currentColor: string;
  currentWidth: number;
  toolMode: ToolMode;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onToolChange: (mode: ToolMode) => void;
  activeLayer: number;
  onLayerChange: (layer: number) => void;
};
export const ToolBox = ({
  currentColor,
  currentWidth,
  toolMode,
  onColorChange,
  onWidthChange,
  onToolChange,
  activeLayer,
  onLayerChange,
  className = "",
}: ToolBoxProps) => {
  const [showPicker, setShowPicker] = useState(false);
  // ★折りたたみ状態管理
  const [isExpanded, setIsExpanded] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🔽 閉じているときはハンバーガーボタンだけ表示
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`bg-white/90 backdrop-blur p-3 rounded-full border-2 border-gray-800 shadow-lg hover:bg-gray-100 transition-all ${className}`}
        title="Open Tools"
      >
        <Menu size={24} />
      </button>
    );
  }

  // 🔽 開いているとき
  return (
    <div
      className={`flex flex-col gap-4 p-4 bg-white/95 backdrop-blur border-2 border-gray-800 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] w-64 transition-all ${className}`}
    >
      {/* ヘッダー (タイトル & 閉じるボタン) */}
      <div className="flex justify-between items-center border-b-2 border-gray-100 pb-2">
        <span className="text-xs font-bold text-gray-400 tracking-wider">
          TOOLS
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-900"
        >
          <X size={18} />
        </button>
      </div>

      {/* 1. ツール切り替え */}
      <div className="flex gap-2">
        <ToolButton
          icon={<Pen size={18} />}
          label="Pen"
          active={toolMode === "pen"}
          onClick={() => onToolChange("pen")}
        />
        <ToolButton
          icon={<Eraser size={18} />}
          label="Eraser"
          active={toolMode === "eraser"}
          onClick={() => onToolChange("eraser")}
        />
        {/* ★スポイトボタン追加 */}
        <ToolButton
          icon={<Pipette size={18} />}
          label="Pick Color"
          active={toolMode === "pipette"}
          onClick={() => onToolChange("pipette")}
        />
        <ToolButton
          icon={<Hand size={18} />}
          label="Hand"
          active={toolMode === "hand"}
          onClick={() => onToolChange("hand")}
        />
      </div>

      {/* 手のひら・スポイト以外で表示 */}
      {toolMode !== "hand" && toolMode !== "pipette" && (
        <>
          {/* レイヤー切り替え */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-gray-500">LAYER</span>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => onLayerChange(1)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold transition-all ${
                  activeLayer === 1
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Layers size={14} /> 1 (Top)
              </button>
              <button
                onClick={() => onLayerChange(2)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs font-bold transition-all ${
                  activeLayer === 2
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Layers size={14} /> 2 (Bottom)
              </button>
            </div>
          </div>

          {/* 2. ペンの太さ */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-bold text-gray-500">
              <span>SIZE</span>
              <span>{currentWidth}px</span>
            </div>
            <input
              type="range"
              min="1"
              max={PEN_WIDTH}
              value={currentWidth}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
            />
          </div>

          {/* 3. カラーピッカー (ペンモードのみ) */}
          {toolMode === "pen" && (
            <div className="flex flex-col gap-2 relative">
              <span className="text-xs font-bold text-gray-500">COLOR</span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPicker(!showPicker)}
                  className="flex-1 h-10 rounded border-2 border-gray-200 flex items-center justify-between px-2 hover:bg-gray-50 transition-colors"
                  style={{ borderLeft: `8px solid ${currentColor}` }}
                >
                  <span className="text-xs font-mono text-gray-600">
                    {currentColor}
                  </span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
              </div>

              {showPicker && (
                <div
                  ref={pickerRef}
                  className="absolute top-full left-0 mt-2 z-50"
                >
                  <div className="p-2 bg-white border-2 border-gray-800 rounded-lg shadow-xl">
                    <HexColorPicker
                      color={currentColor}
                      onChange={onColorChange}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* スポイトモード時の案内 */}
      {toolMode === "pipette" && (
        <div className="text-xs text-center text-gray-500 py-2 bg-gray-50 rounded border border-gray-200">
          キャンバス上の線をクリックして色を取得
        </div>
      )}
    </div>
  );
};

// ボタン部品
const ToolButton = ({ icon, active, onClick, label }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 p-2 rounded flex justify-center items-center transition-all ${
      active
        ? "bg-gray-900 text-white shadow-inner"
        : "bg-white text-gray-400 hover:bg-gray-100"
    }`}
    title={label}
  >
    {icon}
  </button>
);
