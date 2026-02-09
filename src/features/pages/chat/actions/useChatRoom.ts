import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";

import { Stroke } from "@/constants/canvas";

import { PaintCanvasHandle } from "../components/PaintCanvas";
import {
  startGame,
  finishGame,
  updateThumbnail,
  getArchiveUploadUrl,
} from "./dbAction";

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
  const onSaveStroke = async (stroke: Stroke) => {
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
      const jsonString = canvasHandleRef.current.exportJson();

      // 文字列をBlob化（ファイル化）
      const blob = new Blob([jsonString], { type: "application/json" });

      // ■ 1. サーバーから「アップロード許可証(URL)」をもらう
      const { signedUrl, publicUrl } = await getArchiveUploadUrl(roomId, token);

      // ■ 2. fetch で直接アップロード (PUT送信)
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: blob, // ここにBlobをそのまま渡してOK
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload failed: ${uploadRes.statusText}`);
      }

      // ■ 3. 終了処理 (公開用URLを渡す)
      await finishGame(roomId, publicUrl, token);
    } catch (e) {
      console.error(e);
      alert("終了処理に失敗しました");
    }
  };

  //以下、サムネイル自動更新
  const lastUploadedStrokeCountRef = useRef<number>(0);

  useEffect(() => {
    // 1. 基本ガード
    if (!roomInfo?.is_active || !user || !canvasHandleRef.current) return;

    // 2. 5分おきのタイマー (300000ms)
    const intervalId = setInterval(
      async () => {
        // --- リーダー選出 (省略なしで書くなら前回の通り) ---
        if (!onlineUsers || onlineUsers.length === 0) return;
        const sortedUsers = [...onlineUsers].sort((a, b) =>
          a.id.localeCompare(b.id),
        );
        const isLeader = sortedUsers[0].id === user.id;
        if (!isLeader) return;

        // --- ★追加: サボり判定 ---
        const currentCount = canvasHandleRef.current?.getStrokeCount() ?? 0;

        // 前回から線の数が増えてなければ、何もせず終了！ (通信節約)
        if (currentCount === lastUploadedStrokeCountRef.current) {
          return;
        }

        // --- アップロード処理 ---
        try {
          const blob = await canvasHandleRef.current?.exportImageBlob();
          if (!blob) return;

          const fileName = `room_${roomId}.webp`;
          await supabase.storage.from("thumbnails").upload(fileName, blob, {
            contentType: "image/webp",
            upsert: true,
          });

          // 更新時刻をDBに反映
          await updateThumbnail(roomId);

          // ★ 成功したら「現在のストローク数」を記録
          lastUploadedStrokeCountRef.current = currentCount;
          console.log("📷 サムネ更新完了 (Leader)");
        } catch (err) {
          console.error(err);
        }
      },
      5 * 60 * 1000, // 5分間隔
    );

    return () => clearInterval(intervalId);
  }, [roomId, user, roomInfo?.is_active, onlineUsers]);

  //おわり
  return {
    isReady,
    roomInfo,
    onlineUsers,
    chatMessages,
    onSaveStroke,
    sendChatMessage,
    handleStartGame,
    handleFinishGame,
  };
};
