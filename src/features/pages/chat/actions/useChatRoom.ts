import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
// 🗑️ 削除: import { CanvasPath } from "react-sketch-canvas";
// ✅ 追加: 新しい型定義
import { Stroke } from "@/constants/canvas";

// パスは実際の構成に合わせて調整してください
import { PaintCanvasHandle } from "../components/PaintCanvas";
import { startGame, finishGame } from "./dbAction";

// ■ 型定義
export type User = {
  id: string; // ブラウザ生成のランダムID
  name: string; // 表示名
  color?: string;
};

export type Room = {
  id: number;
  name: string;
  is_active: boolean;
  session_start_at: string | null;
  last_session_image_url: string | null;
  last_session_json_url: string | null;
};

export type ChatMessage = {
  user_name: string;
  text: string;
  timestamp: number;
};

export const useChatRoom = (
  roomId: string,
  user: User | null,
  canvasHandleRef: React.RefObject<PaintCanvasHandle | null>,
) => {
  // ■ State
  const [roomInfo, setRoomInfo] = useState<Room | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isReady, setIsReady] = useState(false); // 初期化完了フラグ

  // ■ 初期化 & リアルタイム接続
  useEffect(() => {
    if (!roomId || !user) return;

    const channel = supabase.channel(`room:${roomId}`);

    // 1. 部屋の初期情報を取得
    const fetchRoom = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (data) setRoomInfo(data);

      // 過去の線（今のセッション分）を取得して描画
      const { data: strokes } = await supabase
        .from("strokes")
        .select("data")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });

      if (strokes && canvasHandleRef.current) {
        // Konva版の drawStroke をループで呼ぶ
        strokes.forEach((s) =>
          canvasHandleRef.current?.drawStroke(s.data as Stroke),
        );
      }
      setIsReady(true);
    };

    fetchRoom();

    // 2. Realtime Subscription 設定
    channel
      // A. 【お絵描き】 他の人が描いた線を受信
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "strokes",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // 自分が描いた線じゃなければ描画
          if (payload.new.user_id !== user.id) {
            // ✅ 型アサーションを Stroke に変更
            canvasHandleRef.current?.drawStroke(payload.new.data as Stroke);
          }
        },
      )
      // B. 【部屋状態】 スタート/終了/アーカイブ更新を検知
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          setRoomInfo(payload.new as Room);

          // もし is_active が false になったら（終了したら）、キャンバスをクリア
          if (payload.new.is_active === false) {
            canvasHandleRef.current?.resetCanvas();
            setChatMessages([]); // チャットもクリア
          }
        },
      )
      // C. 【チャット】 Broadcast受信
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setChatMessages((prev) => [...prev, payload]);
      })
      // D. 【在室管理】 Presence同期
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as unknown as User[];
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          // 入室を通知
          await channel.track({
            id: user.id,
            name: user.name,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  // ■ アクション関数

  // 1. 線を描いて保存
  // ✅ 引数の型を CanvasPath から Stroke に変更
  const saveStroke = async (stroke: Stroke) => {
    if (!user || !roomInfo?.is_active) return; // 開催中以外は保存しない

    // DBに保存
    await supabase.from("strokes").insert({
      room_id: parseInt(roomId),
      data: stroke, // JSONとしてそのまま入ります
      user_id: user.id,
      user_name: user.name,
    });
  };

  // 2. チャット送信
  const sendChatMessage = async (text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      user_name: user!.name,
      text,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, msg]);

    const channel = supabase.channel(`room:${roomId}`);
    await channel.send({
      type: "broadcast",
      event: "chat",
      payload: msg,
    });
  };

  // 3. ゲーム開始
  const handleStartGame = async (token: string) => {
    try {
      await startGame(roomId, token);
    } catch (e) {
      console.error(e);
      alert("開始できませんでした");
    }
  };

  // 4. ゲーム終了 & アーカイブ
  const handleFinishGame = async (token: string) => {
    if (!canvasHandleRef.current || !confirm("終了してアーカイブしますか？"))
      return;

    try {
      // ✅ 修正: exportPaths はまだ実装していないので画像保存のみにします
      // (もしJSONも保存したい場合は PaintCanvas 側に exportStrokes を追加する必要があります)
      const imageBase64 = await canvasHandleRef.current.exportImage();

      const timestamp = Date.now();
      const imagePath = `archives/${roomId}/${timestamp}.png`;

      const res = await fetch(imageBase64);
      const blob = await res.blob();

      // 画像のみアップロード
      await supabase.storage.from("archives").upload(imagePath, blob);

      const {
        data: { publicUrl: imageUrl },
      } = supabase.storage.from("archives").getPublicUrl(imagePath);

      // JSON URL は null を渡す
      await finishGame(roomId, "", imageUrl, token);
    } catch (e) {
      console.error(e);
      alert("終了処理に失敗しました");
    }
  };

  return {
    isReady,
    roomInfo,
    onlineUsers,
    chatMessages,
    saveStroke,
    sendChatMessage,
    handleStartGame,
    handleFinishGame,
  };
};
