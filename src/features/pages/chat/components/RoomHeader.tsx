"use client";

import { useState, useEffect, useRef } from "react"; // useRef追加
import { Play, StopCircle, Hash, Loader2, Clock } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { Room } from "../actions/useChatRoom";
import { ROOM_LIMIT_MINUTES } from "@/constants/canvas"; // ★定数インポート

type Props = {
  roomId: string;
  roomInfo: Room | null;
  onStart: (token: string) => Promise<void>;
  // ★ 型変更: 自動フラグを受け取れるようにする
  onFinish: (token: string, isAuto?: boolean) => Promise<void>;
};

export const RoomHeader = ({ roomId, roomInfo, onStart, onFinish }: Props) => {
  const isActive = roomInfo?.is_active;

  // 認証中かどうか
  const [isVerifying, setIsVerifying] = useState(false);
  // どっちのボタンを押したか
  const [actionType, setActionType] = useState<"start" | "finish" | null>(null);

  // 経過時間表示用
  const [timerString, setTimerString] = useState("00:00");

  // ★ 追加: 既に自動終了処理が走ったかを記録するフラグ
  const hasAutoFinishedRef = useRef(false);

  // --------------------------------------------------------
  // ★ タイマー & 自動終了監視ロジック
  // --------------------------------------------------------
  useEffect(() => {
    // 部屋が閉じてる、または開始時刻がない場合はリセットして終了
    if (!isActive || !roomInfo?.session_start_at) {
      setTimerString("00:00");
      hasAutoFinishedRef.current = false; // フラグもリセット
      return;
    }

    const calculateTime = () => {
      const start = new Date(roomInfo.session_start_at!).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start); // マイナスにならないように

      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      // 00:00 形式にする
      setTimerString(
        `${minutes.toString().padStart(2, "0")}:${seconds
          .toString()
          .padStart(2, "0")}`,
      );

      // ★★★ ここで制限時間チェック！ ★★★
      // 分換算の秒数を超えていたら終了
      const limitSeconds = ROOM_LIMIT_MINUTES * 60;

      if (totalSeconds >= limitSeconds && !hasAutoFinishedRef.current) {
        hasAutoFinishedRef.current = true; // 2回実行されないようにガード

        // アラート表示
        alert(
          `制限時間の${ROOM_LIMIT_MINUTES}分が経過しました。終了処理を行います。`,
        );

        // 親のWrapperを叩く (tokenは空文字、isAuto=true)
        onFinish("", true);
      }
    };

    // 初回実行
    calculateTime();

    // 1秒ごとに更新
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [isActive, roomInfo?.session_start_at, onFinish]);

  // --------------------------------------------------------
  // アクションハンドラ
  // --------------------------------------------------------
  const handleActionClick = (type: "start" | "finish") => {
    setActionType(type);
    setIsVerifying(true);
  };

  const handleTurnstileSuccess = async (token: string) => {
    try {
      if (actionType === "start") {
        await onStart(token);
      } else if (actionType === "finish") {
        await onFinish(token);
      }
    } catch (e) {
      console.error(e);
      alert("処理に失敗しました");
    } finally {
      setIsVerifying(false);
      setActionType(null);
    }
  };

  return (
    <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] overflow-hidden relative">
      {/* 部屋情報 */}
      <div className="flex items-center gap-4">
        <div className="bg-gray-100 p-2 rounded-lg border-2 border-gray-800">
          <Hash size={24} className="text-gray-700" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">
            Room: {roomId}
          </h1>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-gray-500">Status:</span>
            {isActive ? (
              <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded border border-green-200 animate-pulse">
                OPEN
              </span>
            ) : (
              <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                CLOSE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* アクションエリア */}
      <div className="flex gap-4 items-center relative">
        {/* ★ タイマー表示 (OPEN中のみ表示) */}
        {isActive && (
          <div className="flex items-center gap-2 bg-gray-800 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-md font-mono font-bold border-2 border-gray-800 shadow-sm">
            <Clock size={16} className="text-green-400" />

            {/* 縦に並べるレイアウト */}
            <div className="flex flex-col items-end leading-none">
              <span className="text-[9px] text-gray-400 font-sans mb-0.5">
                LIMIT 60min
              </span>
              <span className="text-sm sm:text-base tracking-widest">
                {timerString}
              </span>
            </div>
          </div>
        )}

        {/* ボタン群 */}
        <div className="flex gap-2 relative">
          {/* Turnstile ローディングオーバーレイ */}
          {isVerifying && (
            <div className="absolute inset-0 bg-white/90 z-20 flex items-center justify-center gap-2 rounded-lg">
              <Loader2 className="animate-spin text-gray-600" size={20} />
              <span className="font-bold text-xs text-gray-600">
                Checking...
              </span>
              <div className="opacity-0 w-0 h-0 overflow-hidden">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                  onSuccess={handleTurnstileSuccess}
                  options={{ size: "compact" }}
                />
              </div>
            </div>
          )}

          {!isActive ? (
            <button
              onClick={() => handleActionClick("start")}
              disabled={isVerifying}
              className="flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-2 rounded-lg border-2 border-gray-800 hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
            >
              <Play size={20} strokeWidth={3} /> スタート
            </button>
          ) : (
            <button
              onClick={() => handleActionClick("finish")}
              disabled={isVerifying}
              className="flex items-center gap-2 bg-red-500 text-white font-bold px-6 py-2 rounded-lg border-2 border-gray-800 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
            >
              <StopCircle size={20} strokeWidth={3} /> 終了
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
