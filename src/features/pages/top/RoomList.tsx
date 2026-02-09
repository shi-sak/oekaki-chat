// src/features/pages/top/RoomList.tsx (イメージ)

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client"; // クライアント用
import { Room } from "@/features/pages/chat/actions/useChatRoom"; // 型定義
import { THUMB_URL_BASE } from "@/constants/top";

// 1時間のミリ秒
const ONE_HOUR_MS = 60 * 60 * 1000;

export const RoomList = () => {
  const [rooms, setRooms] = useState<Room[]>([]);

  // 1. 部屋情報を取得 (リアルタイム購読してもOK)
  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase.from("rooms").select("*").order("id");
      if (data) setRooms(data as Room[]);
    };
    fetchRooms();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {rooms.map((room) => {
        // 1. 開始時刻から現在までの経過時間
        const startTime = room.session_start_at
          ? new Date(room.session_start_at).getTime()
          : 0;
        const now = Date.now();
        const isExpired = now - startTime > ONE_HOUR_MS;

        // 2. 「本当に開催中」か？ (DBがActive かつ 時間内)
        // ゾンビ部屋なら false になる
        const isRealActive = room.is_active && !isExpired;

        // サムネイルURL (固定パス + 更新時間でキャッシュ回避)
        // ※ ゾンビ部屋の場合は、サムネを表示するのか、デフォルトに戻すのかはお好みで
        const thumbUrl = THUMB_URL_BASE;

        return (
          <div
            key={room.id}
            className="border rounded-lg p-4 shadow-lg bg-white"
          >
            {/* サムネイル */}
            <div className="aspect-video bg-gray-200 relative mb-4">
              <img
                src={thumbUrl}
                alt={room.name}
                className={`w-full h-full object-cover ${!isRealActive ? "grayscale opacity-50" : ""}`}
              />
              {/* ステータスバッジ */}
              <span
                className={`absolute top-2 left-2 px-2 py-1 rounded text-white text-sm font-bold ${isRealActive ? "bg-green-500" : "bg-gray-500"}`}
              >
                {isRealActive ? "開催中 🔥" : "空き部屋 💤"}
              </span>
            </div>

            <h2 className="text-xl font-bold mb-2">{room.name}</h2>

            {/* 1時間経過でゾンビ化している場合のアナウンス */}
            {room.is_active && isExpired && (
              <p className="text-xs text-red-500 mb-2">
                ※ 前回のセッションが時間切れのため、リセットして開始します
              </p>
            )}

            <a
              href={`/room/${room.id}`}
              className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-bold transition"
            >
              {isRealActive ? "参加する" : "新しく始める"}
            </a>
          </div>
        );
      })}
    </div>
  );
};
