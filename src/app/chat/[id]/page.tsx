import { ChatRoom } from "@/features/pages/chat/ChatRoom";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-gray-50">
      <ChatRoom roomId={id} />
    </main>
  );
}
