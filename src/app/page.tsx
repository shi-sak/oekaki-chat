"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

import { supabase } from "@/lib/supabase/client";

import { RoomList, Room } from "@/features/pages/top/RoomList";

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);

  // ■ 部屋一覧の取得 & 監視
  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from("rooms")
        .select("*")
        .order("id", { ascending: true });

      if (data) setRooms(data);
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
            <div className="bg-black text-white p-3 rounded-xl shadow-lg">
              <Palette size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-tight">
              HYPER OEKAKI CHAT
            </h1>
          </div>
        </header>

        {/* リスト表示コンポーネント */}
        <RoomList rooms={rooms} />
      </div>
    </div>
  );
}
