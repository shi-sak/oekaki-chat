// src/constants/canvas.ts

//キャンバスサイズ
export const CANVAS_WIDTH = 2000;
export const CANVAS_HEIGHT = 2000;

//レイヤー
export const LAYER_RENDER_ORDER = [2, 1];

// ★ 1. ツールモードをここで定義
export type ToolMode = "pen" | "eraser" | "hand" | "pipette";

//ペンの最大太さ
export const PEN_WIDTH = 100;

// ストローク（線）のデータ定義
export type Stroke = {
  id: string;
  points: number[];
  color: string;
  width: number;
  tool: ToolMode; // ★ここで使う
  layerId: number;
};

// ★ 2. コンポーネントとフックで共有するProps定義
export type CommonCanvasProps = {
  onDrawEnd: (stroke: Stroke) => void;
  onColorPick?: (color: string) => void;
  strokeColor: string;
  strokeWidth: number;
  toolMode: ToolMode;
  activeLayer: number;
  disabled: boolean;
};
