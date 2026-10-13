"use client";

import {
  useImperativeHandle,
  Ref,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
import { Stage, Layer, Line, Rect, Group } from "react-konva";
import Konva from "konva";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAYER_RENDER_ORDER,
  CommonCanvasProps,
  Stroke,
} from "@/constants/canvas";
import { useKonva } from "@/features/pages/chat/actions/useKonva";
import { useRoomContext } from "../contexts/RoomContext";

const CHUNK_SIZE = 50; // ★ 50本たまったら一気にキャッシュを更新する

// キャッシュ1枚あたりの最大ピクセル数（iOS Safari の canvas 上限 ≒ 16.7M px に収める）
const MAX_CACHE_PIXELS = 16_000_000;
// ズーム・パン後、操作が止まってから再キャッシュするまでの待ち時間
const RECACHE_DELAY_MS = 150;

// 確定済みの線。memo なので描画中(マウス移動ごと)の再レンダーでは何もしない
const StrokeLines = memo(({ lines }: { lines: Stroke[] }) => (
  <>
    {lines.map((line) => (
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
        perfectDrawEnabled={false}
      />
    ))}
  </>
));
StrokeLines.displayName = "StrokeLines";

export interface PaintCanvasHandle {
  drawStroke: (stroke: Stroke) => void;
  drawStrokes: (strokes: Stroke[]) => void;
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
  const { onSaveStroke, onCanvasReady } = useRoomContext();
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

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  // レイヤーごとに「キャッシュする線(50本単位)」と「まだキャッシュしない線」に分ける
  const splitLines = useMemo(() => {
    const map = new Map<number, { staticLines: Stroke[]; dynamicLines: Stroke[] }>();
    LAYER_RENDER_ORDER.forEach((layerId) => {
      const layerLines = lines.filter((l) => {
        if (layerId === 1) return l.layerId === 1 || !l.layerId;
        return l.layerId === layerId;
      });
      const staticCount = Math.floor(layerLines.length / CHUNK_SIZE) * CHUNK_SIZE;
      map.set(layerId, {
        staticLines: layerLines.slice(0, staticCount),
        dynamicLines: layerLines.slice(staticCount),
      });
    });
    return map;
  }, [lines]);

  // ■ 静的グループを「今見えている範囲(+余白)」だけ「画面の解像度」でキャッシュする
  //   固定 pixelRatio:1 だとズーム時・Retina で引き伸ばされて荒くなるため
  const recache = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const scale = stage.scaleX();
    const viewW = stage.width() / scale;
    const viewH = stage.height() / scale;
    const viewX = -stage.x() / scale;
    const viewY = -stage.y() / scale;

    // パンしてもすぐ空白にならないよう、上下左右に画面半分ずつ余白をとる
    const x = Math.max(0, Math.floor(viewX - viewW / 2));
    const y = Math.max(0, Math.floor(viewY - viewH / 2));
    const right = Math.min(CANVAS_WIDTH, Math.ceil(viewX + viewW * 1.5));
    const bottom = Math.min(CANVAS_HEIGHT, Math.ceil(viewY + viewH * 1.5));
    const width = right - x;
    const height = bottom - y;
    if (width <= 0 || height <= 0) return; // キャンバスが画面外

    const idealRatio = scale * (window.devicePixelRatio || 1);
    const maxRatio = Math.sqrt(MAX_CACHE_PIXELS / (width * height));
    const pixelRatio = Math.min(idealRatio, maxRatio);

    staticGroupRefs.current.forEach((group, layerId) => {
      if ((splitLines.get(layerId)?.staticLines.length ?? 0) === 0) {
        group.clearCache();
        return;
      }
      try {
        group.cache({ x, y, width, height, pixelRatio });
      } catch (e) {}
    });
  }, [splitLines, stageRef]);

  // 50本たまった / リセットされた時は、次の描画より前に再キャッシュ（一瞬線が消えるのを防ぐ）
  const cacheKey = LAYER_RENDER_ORDER.map((id) => {
    const st = splitLines.get(id)?.staticLines ?? [];
    return `${st.length}:${st[st.length - 1]?.id ?? ""}`;
  }).join("|");
  useLayoutEffect(() => {
    recache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // ズーム・パンは操作が落ち着いてから再キャッシュ（それまでは古いキャッシュを拡縮表示）
  const recacheTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRecache = useCallback(() => {
    if (recacheTimerRef.current) clearTimeout(recacheTimerRef.current);
    recacheTimerRef.current = setTimeout(recache, RECACHE_DELAY_MS);
  }, [recache]);
  useEffect(() => {
    scheduleRecache();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageScale, stagePos]);
  useEffect(() => {
    return () => {
      if (recacheTimerRef.current) clearTimeout(recacheTimerRef.current);
    };
  }, []);

  const handleMouseDownWrapped = (e: any) => {
    // ■ スポイト処理 (画面のDOMから直接色を抜く最強版)
    if (toolMode === "pipette") {
      const stage = stageRef.current;
      if (!stage) return;
      
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      // デバイスのピクセル比（Retinaディスプレイ等の高画質ズレを補正）
      const ratio = window.devicePixelRatio || 1;
      const targetX = pointerPos.x * ratio;
      const targetY = pointerPos.y * ratio;

      // 1x1ピクセルの作業用キャンバスをメモリ上に作る
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 1;
      tempCanvas.height = 1;
      const ctx = tempCanvas.getContext("2d");

      if (ctx) {
        // ステージ上の全レイヤーのHTML <canvas> 要素を順番に重ねていく
        stage.getLayers().forEach((layer) => {
          const nativeCanvas = layer.getNativeCanvasElement();
          // ブラウザに表示されているCanvasから、マウス位置の1pxだけをコピー
          ctx.drawImage(nativeCanvas, targetX, targetY, 1, 1, 0, 0, 1, 1);
        });

        const p = ctx.getImageData(0, 0, 1, 1).data;
        const hex = rgbToHex(p[0], p[1], p[2]);
        onColorPick?.(hex);
      }
      return;
    }

    isDrawingRef.current = true;
    handlers.handleMouseDown(e);
  };

  const handleMouseUpWrapped = () => {
    isDrawingRef.current = false;
    handlers.handleMouseUp();
  };

  // ■ キャンバスの外でボタンを離しても、ちゃんと線を確定させる
  //   (Konva はステージの上で離した時しか mouseup を受け取らないため、window で拾う)
  const mouseUpRef = useRef(handleMouseUpWrapped);
  useEffect(() => {
    mouseUpRef.current = handleMouseUpWrapped;
  });
  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (isDrawingRef.current) mouseUpRef.current();
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    // 描いている途中でウィンドウが切り替わった時も確定させる
    window.addEventListener("blur", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("blur", handleWindowMouseUp);
    };
  }, []);

  useImperativeHandle(ref, () => ({
    drawStroke: actions.addStroke,
    drawStrokes: actions.addStrokes,
    resetCanvas: actions.resetCanvas,
    getStrokeCount: () => lines.length,
    zoomIn: actions.zoomIn,
    zoomOut: actions.zoomOut,
    resetView: actions.resetView,

    exportImageBlob: async (type: "png" | "webp" = "webp") => {
      // 描いている途中なら書き終わるまで待つ (止まったままにならないよう最大5秒)
      for (let i = 0; i < 50 && isDrawingRef.current; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const stage = stageRef.current;
      if (!stage) return null;

      const oldScale = stage.scaleX();
      const oldPos = stage.position();
      stage.scale({ x: 1, y: 1 });
      stage.position({ x: 0, y: 0 });

      // 書き出し前はキャッシュを剥がす
      staticGroupRefs.current.forEach((group) => group.clearCache());

      const TARGET_WIDTH = 300;
      const ratio = TARGET_WIDTH / CANVAS_WIDTH;
      const pixelRatio = type === "png" ? 1 : ratio;

      const tempCanvas = stage.toCanvas({
        x: 0,
        y: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pixelRatio,
      });

      stage.scale({ x: oldScale, y: oldScale });
      stage.position(oldPos);

      // 終わったら戻す
      recache();

      return new Promise((resolve) => {
        tempCanvas.toBlob(
          (blob) => resolve(blob),
          type === "png" ? "image/png" : "image/webp",
          type === "png" ? 1 : 0.6,
        );
      });
    },
  }));

  // 準備ができたことを親に知らせる (読み込み中に届いた線をここで描いてもらう)
  useEffect(() => {
    onCanvasReady();
  }, [onCanvasReady]);

  const CIRCLE_CURSOR = `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='5' height='7' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='%23ffffff' stroke='%23000000' stroke-width='2'/%3E%3C/svg%3E") 12 12, crosshair`;

  return (
    <Stage
      ref={stageRef}
      width={window.innerWidth}
      height={600}
      draggable={toolMode === "hand"}
      onWheel={handlers.handleWheel}
      onDragEnd={scheduleRecache}
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
        const { staticLines, dynamicLines } = splitLines.get(layerId)!;

        const isDrawingOnThisLayer =
          activeLayer === layerId && currentPoints.length > 0;

        return (
          <Layer
            key={layerId}
            ref={(node) => {
              if (node) layerRefs.current.set(layerId, node);
            }}
            // 線はクリック判定に使わないので、ヒット判定用の描画を省いて軽くする
            listening={false}
            clipX={0}
            clipY={0}
            clipWidth={CANVAS_WIDTH}
            clipHeight={CANVAS_HEIGHT}
          >
            {/* ■ 静的グループ (50本単位でキャッシュされる) */}
            <Group
              ref={(node) => {
                if (node) {
                  staticGroupRefs.current.set(layerId, node);
                }
              }}
            >
              <StrokeLines lines={staticLines} />
            </Group>

            {/* ■ 動的グループ (最大50本) */}
            <Group>
              <StrokeLines lines={dynamicLines} />

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