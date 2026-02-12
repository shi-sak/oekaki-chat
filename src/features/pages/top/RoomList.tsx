"use client";

import Link from "next/link";
import { Users, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

import { ROOM_LIMIT_MINUTES } from "@/constants/canvas"; // 定数使用

export type Room = {
  id: string;
  name: string;
  is_active: boolean;
  thumbnail_updated_at: string | null;
  session_start_at: string | null; // ★ 追加
};

type Props = {
  rooms: Room[];
};

export const RoomList = ({ rooms }: Props) => {
  // 残り時間を計算するヘルパー関数
  const getTimeRemaining = (startAt: string) => {
    const start = new Date(startAt).getTime();
    const now = new Date().getTime();
    const elapsedMinutes = (now - start) / (1000 * 60);
    const remaining = Math.max(0, ROOM_LIMIT_MINUTES - elapsedMinutes);
    return Math.ceil(remaining); // 切り上げ（残り1分未満でも"1分"と出す）
  };

  // ループ内で使うためにここで初期化
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {rooms.map((room) => {
        // ▼ ループ内で個別にURL生成 (同期処理なので高速です)

        // ★ 変更: 基本はデフォルト画像
        let displayUrl = "/default.webp";

        // ★ 変更: 更新日時がある場合だけ Supabase URL + キャッシュ対策パラメータ
        if (room.thumbnail_updated_at) {
          const {
            data: { publicUrl },
          } = supabase.storage
            .from("thumbnails")
            .getPublicUrl(`room_${room.id}.webp`);

          displayUrl = `${publicUrl}?v=${new Date(room.thumbnail_updated_at).getTime()}`;
        }

        // ★ 残り時間計算
        const remainingMinutes =
          room.is_active && room.session_start_at
            ? getTimeRemaining(room.session_start_at)
            : 0;

        return (
          <Link
            key={room.id}
            href={`/chat/${room.id}`}
            className={`group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 ${
              room.is_active
                ? "bg-white border-transparent"
                : "bg-gray-100 border-transparent opacity-80 hover:opacity-100"
            }`}
          >
            {/* --- 画像エリア --- */}
            <div className="aspect-video relative w-full overflow-hidden bg-gray-200">
              {room.is_active ? (
                <>
                  {/* サムネイル画像 */}
                  <img
                    src={displayUrl}
                    alt={room.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* 左上の「LIVE」バッジ */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-500/90 text-white text-xs font-bold px-2 py-1 rounded-full shadow backdrop-blur-sm animate-pulse">
                    <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                    LIVE
                  </div>

                  {/* ★ 右上: 残り時間バッジ (追加) */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                    <Clock
                      size={12}
                      className={
                        remainingMinutes < 10 ? "text-red-400" : "text-white"
                      }
                    />
                    <span>あと {remainingMinutes} 分</span>
                  </div>

                  {/* 右下の参加人数（仮） */}
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1.5">
                    <Users size={14} />
                    <span>参加中</span>
                  </div>
                </>
              ) : (
                /* --- 非アクティブ時のグレー背景 --- */
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-200/50 inner-shadow">
                  <Users size={48} className="mb-2 opacity-20" />
                  <span className="font-bold text-sm text-gray-500">
                    誰もいません
                  </span>
                  <span className="text-xs text-gray-400 mt-1">
                    タップして開始
                  </span>
                </div>
              )}
            </div>

            {/* --- 情報エリア --- */}
            <div className="p-5">
              <h3
                className={`font-bold text-lg mb-1 truncate ${
                  !room.is_active && "text-gray-500"
                }`}
              >
                {room.name}
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                {room.is_active ? (
                  <span className="text-green-600 font-bold">● 開催中</span>
                ) : (
                  <span>停止中</span>
                )}
                <span className="mx-1">·</span>
                ID: {room.id}
              </p>
            </div>
          </Link>
        );
      })}

      {/* 部屋がない場合 */}
      {rooms.length === 0 && (
        <div className="col-span-full text-center py-20 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          部屋が見つかりません... DBを確認してね
        </div>
      )}
    </div>
  );
};
