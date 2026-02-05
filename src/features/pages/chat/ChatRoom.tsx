"use client";

import { useRef, useState, useEffect } from "react";
import { PaintCanvasHandle } from "./components/PaintCanvas";
import { useChatRoom, User } from "./actions/useChatRoom";
import { JoinScreen } from "./components/JoinScreen";
import { RoomHeader } from "./components/RoomHeader";
import { CanvasSection } from "./components/CanvasSection";
import { SidePanel } from "./components/SidePanel";

export const ChatRoom = ({ roomId }: { roomId: string }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const canvasHandleRef = useRef<PaintCanvasHandle>(null);

  const {
    roomInfo,
    onlineUsers,
    chatMessages,
    saveStroke,
    sendChatMessage,
    handleStartGame,
    handleFinishGame,
  } = useChatRoom(roomId, currentUser, canvasHandleRef);

  useEffect(() => {
    const savedName = sessionStorage.getItem(`oekaki_name_${roomId}`);
    const savedId = sessionStorage.getItem(`oekaki_id_${roomId}`);
    if (savedName && savedId) {
      setCurrentUser({ id: savedId, name: savedName });
    }
  }, [roomId]);

  const handleJoin = (name: string) => {
    const newUser = { id: crypto.randomUUID(), name };
    sessionStorage.setItem(`oekaki_name_${roomId}`, newUser.name);
    sessionStorage.setItem(`oekaki_id_${roomId}`, newUser.id);
    setCurrentUser(newUser);
  };

  if (!currentUser) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <RoomHeader
            roomId={roomId}
            roomInfo={roomInfo}
            onStart={handleStartGame}
            onFinish={handleFinishGame}
          />
          <CanvasSection
            canvasHandleRef={canvasHandleRef}
            roomInfo={roomInfo}
            onStroke={saveStroke}
          />
        </div>
        <SidePanel
          currentUser={currentUser}
          onlineUsers={onlineUsers}
          chatMessages={chatMessages}
          onSendChat={sendChatMessage}
        />
      </div>
    </div>
  );
};
