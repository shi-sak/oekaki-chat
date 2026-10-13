import { notFound } from "next/navigation";
import { ChatRoom } from "@/features/pages/chat/ChatRoom";
import { supabase } from "@/lib/supabase/client";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  // 数字以外のIDや、存在しない部屋は 404 (同じフォルダの not-found.tsx が出る)
  if (!/^\d+$/.test(id)) notFound();
  const { data: room, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!room) notFound();

  return (
    <main className="min-h-screen bg-gray-50">
      <ChatRoom roomId={id} />
    </main>
  );
}
