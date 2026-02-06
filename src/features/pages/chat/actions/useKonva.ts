// src/lib/useKonva.ts

import { useState, useRef } from "react";
import Konva from "konva";
import { KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { Stroke, CommonCanvasProps } from "@/constants/canvas";

export const useKonva = ({
  onDrawEnd,
  onColorPick,
  strokeColor,
  strokeWidth,
  toolMode,
  activeLayer,
  disabled,
}: CommonCanvasProps) => {
  const stageRef = useRef<Konva.Stage>(null);
  const isDrawing = useRef(false);

  // ■ 状態管理
  const [lines, setLines] = useState<Stroke[]>([]); // 描画済みの線
  const [currentPoints, setCurrentPoints] = useState<number[]>([]); // 今描いている線
  const [stageScale, setStageScale] = useState<number>(0.5); // ズーム
  const [stagePos, setStagePos] = useState<Vector2d>({ x: 0, y: 0 }); // 位置

  // ______________________________________________________________________
  // ✍️ 描画イベントハンドラ

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (toolMode === "hand" || disabled) return;

    if (toolMode === "pipette") {
      // e.target はクリックされた Konvaノード（線など）
      const target = e.target;

      // 背景(Rect)をクリックした場合は無視、線(Line)なら色取得
      // KonvaのLineオブジェクトは attrs.stroke に色を持っています
      if (target.className === "Line") {
        const pickedColor = target.attrs.stroke;
        if (pickedColor && onColorPick) {
          onColorPick(pickedColor); // 親に色を渡す
        }
      }
      return; // 描画はしないのでここで終了
    }

    isDrawing.current = true;
    const stage = e.target.getStage();
    const pos = stage?.getRelativePointerPosition();
    if (pos) {
      setCurrentPoints([pos.x, pos.y]);
    }
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!isDrawing.current || toolMode === "hand") return;

    const stage = e.target.getStage();
    const pos = stage?.getRelativePointerPosition();
    if (pos) {
      setCurrentPoints((prev) => [...prev, pos.x, pos.y]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentPoints.length > 0) {
      const newStroke: Stroke = {
        id: crypto.randomUUID(), // ID生成
        points: currentPoints,
        color: strokeColor,
        width: strokeWidth,
        tool: toolMode === "eraser" ? "eraser" : "pen",
        layerId: activeLayer,
      };

      setLines((prev) => [...prev, newStroke]); // ローカル更新
      onDrawEnd(newStroke); // DB送信
      setCurrentPoints([]); // リセット
    }
  };

  // ______________________________________________________________________
  // 🔍 ズームイベントハンドラ

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;

    // 制限: 0.1倍 〜 10倍
    if (newScale < 0.1 || newScale > 10) return;

    setStageScale(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  // ______________________________________________________________________
  // 🎮 外部公開アクション (exportImageなど)

  const exportImage = async () => {
    const stage = stageRef.current;
    if (!stage) return "";

    const oldScale = stage.scaleX();
    const oldPos = stage.position();

    // 原寸大に戻してキャプチャ
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });

    // 復元
    stage.scale({ x: oldScale, y: oldScale });
    stage.position(oldPos);

    return dataUrl;
  };

  const resetCanvas = () => setLines([]);
  const addStroke = (stroke: Stroke) => setLines((prev) => [...prev, stroke]);

  return {
    stageRef,
    lines,
    currentPoints,
    stageScale,
    stagePos,
    handlers: {
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      handleWheel,
    },
    actions: {
      exportImage,
      resetCanvas,
      addStroke,
    },
  };
};
