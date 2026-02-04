import { useEffect, RefObject } from "react";
import { CanvasPath } from "react-sketch-canvas";
import { supabase } from "@/lib/supabase";
import { PaintCanvasHandle } from "../components/PaintCanvas";

export const useChatRoom = (
  roomId: string,
  canvasRef: RefObject<PaintCanvasHandle | null>,
) => {
  useEffect(() => {
    if (!roomId) return;

    // 1. 過去ログの取得 & 描画
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("strokes")
        .select("data")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching history:", error);
        return;
      }

      // 取得したデータをCanvasに描画
      data?.forEach((row) => {
        // ※ 型アサーションは適宜調整してください
        canvasRef.current?.drawStroke(row.data as unknown as CanvasPath);
      });
    };

    fetchHistory();

    // 2. リアルタイム受信の設定
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "strokes",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // 新しい線が来たら描画
          canvasRef.current?.drawStroke(
            payload.new.data as unknown as CanvasPath,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "strokes",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          // 削除イベントが来たらリセット
          canvasRef.current?.resetCanvas();
        },
      )
      .subscribe();

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, canvasRef]);

  // 送信アクション
  const saveStroke = async (stroke: CanvasPath) => {
    const { error } = await supabase.from("strokes").insert({
      room_id: parseInt(roomId),
      data: stroke,
    });
    if (error) console.error("Save error:", error);
  };

  // リセットアクション
  const resetRoom = async () => {
    if (!confirm("本当に消しますか？全員の画面から消えます！")) return;
    const { error } = await supabase
      .from("strokes")
      .delete()
      .eq("room_id", roomId);
    if (error) console.error("Reset error:", error);
  };

  return { saveStroke, resetRoom };
};
