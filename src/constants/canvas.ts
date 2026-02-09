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
  tool: ToolMode;
  layerId: number;
};

export type CommonCanvasProps = {
  // Context経由で渡すけど、フック側では必要な定義
  onSaveStroke: (stroke: Stroke) => void;
  //スポイト用
  onColorPick?: (color: string) => void;

  //色、太さ、アクティブレイヤー、ツール情報
  strokeColor: string;
  strokeWidth: number;
  activeLayer: number;
  toolMode: ToolMode;

  // キャンバスは書き込める状態か？
  disabled?: boolean;
};
