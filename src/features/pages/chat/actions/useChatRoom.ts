import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";

import { Stroke } from "@/constants/canvas";

import { PaintCanvasHandle } from "../components/PaintCanvas";
import {
  startGame,
  finishGame,
  getArchiveUploadUrl,
  uploadThumbnailAction,
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
  last_session_image_url: string | null;
  last_session_ended_at: string | null;
};

export type ChatMessage = {
  user_id: string;
  user_name: string;
  text: string;
  timestamp: number;
};

// 部屋にいる人の中から代表者(リーダー)を1人決める
// (全員が同じ人を選ぶように、IDの並び順で決める)
const pickLeaderId = (users: User[]) => users.map((u) => u.id).sort()[0];

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

  // ■ キャンバスへの線の受け渡し
  // キャンバス(PaintCanvas)は遅れて読み込まれるので、準備前に届いた線はここに溜めておく
  const pendingStrokesRef = useRef<Stroke[]>([]);

  const deliverStrokes = useCallback(
    (strokes: Stroke[]) => {
      const canvas = canvasHandleRef.current;
      if (canvas) {
        canvas.drawStrokes(strokes);
      } else {
        pendingStrokesRef.current = pendingStrokesRef.current.concat(strokes);
      }
    },
    [canvasHandleRef],
  );

  // キャンバスの準備ができたら呼ばれる (溜まっていた線をまとめて描く)
  const onCanvasReady = useCallback(() => {
    const pending = pendingStrokesRef.current;
    if (pending.length === 0) return;
    pendingStrokesRef.current = [];
    canvasHandleRef.current?.drawStrokes(pending);
  }, [canvasHandleRef]);

  // ■ 初期化 & リアルタイム接続
  useEffect(() => {
    if (!roomId || !user) return;

    let cancelled = false;
    const channel = supabase.channel(`room:${roomId}`);

    // 過去の線を読み終わるまで、リアルタイムで届いた線はここで待たせる
    // (先に届いた新しい線が、あとから読んだ古い線の下に描かれないように)
    let historyLoaded = false;
    const queuedStrokes: Stroke[] = [];
    // 履歴とリアルタイムの両方で同じ線が届くことがあるので、IDで重複を除く
    const seenIds = new Set<string>();
    const receiveStrokes = (strokes: Stroke[]) => {
      const fresh = strokes.filter((s) => !seenIds.has(s.id));
      fresh.forEach((s) => seenIds.add(s.id));
      if (fresh.length > 0) deliverStrokes(fresh);
    };

    // 購読が始まったら解決する (過去の線の取得はこれを待つ)
    let markSubscribed = () => {};
    const subscribed = new Promise<void>((resolve) => {
      markSubscribed = resolve;
    });

    // 1. 部屋の初期情報を取得
    const fetchRoom = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();
      if (cancelled || !data) return;
      setRoomInfo(data);

      if (data.is_active) {
        // 過去の線（今のセッション分）を取得
        // 購読開始を待ってから取ることで、取得〜購読開始の間に描かれた線も取りこぼさない
        await subscribed;
        const { data: strokes } = await supabase
          .from("strokes")
          .select("data")
          .eq("room_id", roomId)
          .order("created_at", { ascending: true })
          .limit(20000);
        if (cancelled) return;
        receiveStrokes((strokes ?? []).map((s) => s.data as Stroke));
      }

      // 待たせていた線を、過去の線のあとに描く
      historyLoaded = true;
      receiveStrokes(queuedStrokes.splice(0));
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
          // 自分が描いた線は手元で描画済み
          if (payload.new.user_id === user.id) return;

          const stroke = payload.new.data as Stroke;
          if (historyLoaded) {
            receiveStrokes([stroke]);
          } else {
            queuedStrokes.push(stroke);
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
            pendingStrokesRef.current = [];
            seenIds.clear();
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
          markSubscribed();
          // 入室を通知
          await channel.track({
            id: user.id,
            name: user.name,
            online_at: new Date().toISOString(),
          });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          // 購読に失敗しても、過去の線だけは読み込む
          markSubscribed();
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, user, canvasHandleRef, deliverStrokes]);

  // ■ アクション関数

  // 1. 線を描いて保存
  const onSaveStroke = async (stroke: Stroke) => {
    if (!user || !roomInfo?.is_active) return; // 開催中以外は保存しない

    // DBに保存
    await supabase.from("strokes").insert({
      room_id: parseInt(roomId),
      data: stroke, // JSONとしてそのまま入る
      user_id: user.id,
      user_name: user.name,
    });
  };

  // 2. チャット送信
  const sendChatMessage = async (text: string) => {
    if (!text.trim()) return;
    const msg: ChatMessage = {
      user_id: user!.id,
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
  // (画像は呼び出し側で1回だけ作って渡す。失敗したら throw する)
  const handleFinishGame = async (token: string, image: Blob) => {
    // 1. サーバーから「アップロード許可証(URL)」をもらう
    const { signedUrl, finishToken } = await getArchiveUploadUrl(
      roomId,
      token,
      image.size,
    );

    // 2. fetch で直接アップロード
    const uploadRes = await fetch(signedUrl, {
      method: "PUT",
      body: image,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000", //キャッシュ
      },
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.statusText}`);
    }

    // 3. 終了処理 (画像のURLはサーバー側で決めてDBに保存する)
    await finishGame(roomId, finishToken);
  };

  // 5. 自分が代表者(リーダー)か (自動終了・サムネイル更新は代表者1人だけが行う)
  const isLeader = !!user && pickLeaderId(onlineUsers) === user.id;

  //以下、サムネイル更新処理

  // ■ 1. 最新の値を保持するための Ref を用意
  const onlineUsersRef = useRef(onlineUsers);
  const roomInfoRef = useRef(roomInfo);
  const lastUploadedStrokeCountRef = useRef<number>(0);
  // ■ 2. 値が変わるたびに Ref を更新 (ここは何度走っても軽い)
  useEffect(() => {
    onlineUsersRef.current = onlineUsers;
    roomInfoRef.current = roomInfo;
  }, [onlineUsers, roomInfo]);

  // ■ 3. タイマー本体 (依存配列をスッキリさせる)
  useEffect(() => {
    const intervalId = setInterval(
      async () => {
        if (!user || !canvasHandleRef.current) {
          return;
        }
        // ★ ここで Ref.current を使う (常に最新の値が取れる！)
        const currentRoom = roomInfoRef.current;
        const currentUsers = onlineUsersRef.current;
        // ガード: 部屋が終わってたら何もしない
        if (!currentRoom?.is_active) return;

        // リーダー選出
        if (!currentUsers || currentUsers.length === 0) return;
        if (pickLeaderId(currentUsers) !== user.id) return;

        // --- サボり判定 & アップロード (ここはそのまま) ---
        const currentCount = canvasHandleRef.current?.getStrokeCount() ?? 0;
        if (currentCount === lastUploadedStrokeCountRef.current) return;

        try {
          const blob = await canvasHandleRef.current?.exportImageBlob();
          if (!blob) return;

          const formData = new FormData();
          formData.append("file", blob);

          //アップロード
          const result = await uploadThumbnailAction(roomId, formData);
          if (!result.success) {
            console.log(result.error);
          }

          lastUploadedStrokeCountRef.current = currentCount;
        } catch (err) {
          console.error(err);
        }
      },
      5 * 60 * 1000,
    ); // 5分

    return () => clearInterval(intervalId);
    // ★ 依存配列はこれだけ！
    // roomId や user が変わらない限り、タイマーはリセットされません。
  }, [roomId, user]);

  //おわり
  return {
    isReady,
    roomInfo,
    onlineUsers,
    chatMessages,
    isLeader,
    onCanvasReady,
    onSaveStroke,
    sendChatMessage,
    handleStartGame,
    handleFinishGame,
  };
};
