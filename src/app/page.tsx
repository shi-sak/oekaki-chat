"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

import { RoomList, Room } from "@/features/pages/top/RoomList";

import { RoomListSkeleton } from "@/features/pages/top/Loading";
import { TermsModal } from "@/features/pages/top/RuleModal";

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  // ★ 読み込み中フラグ (初期値 true)
  const [isLoading, setIsLoading] = useState(true);
  //モーダル
  const [showTerms, setShowTerms] = useState(false);

  // ■ 部屋一覧の取得 & 監視
  useEffect(() => {
    const fetchRooms = async () => {
      // ※ リアルタイム更新時はローディングを出さないため、ここには setIsLoading(true) を書かない

      const { data } = await supabase
        .from("rooms")
        .select("*")
        .order("id", { ascending: true });

      if (data) setRooms(data as Room[]);

      // ★ データ取得が終わったらローディング解除
      setIsLoading(false);
    };

    fetchRooms();

    const channel = supabase
      .channel("lobby_rooms")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => {
          fetchRooms();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-800">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* ヘッダー */}
        <header className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight">
              HYPER OEKAKI CHAT
            </h1>
          </div>
        </header>

        {/* リスト表示コンポーネント */}
        {isLoading ? <RoomListSkeleton /> : <RoomList rooms={rooms} />}

        {/* フッターエリア (追加) */}
        <footer className="pt-12 border-t border-gray-200 text-center space-y-4">
          <button
            onClick={() => setShowTerms(true)}
            className="text-gray-400 hover:text-gray-600 text-sm font-bold flex items-center justify-center gap-1 mx-auto transition-colors"
          >
            利用規約・プライバシーポリシー
          </button>

          <p className="text-xs text-gray-300 font-mono">
            © 2026 HYPER OEKAKI CHAT
          </p>
        </footer>
      </div>
      {/* モーダル */}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}
