"use client";

import { useRef, useState, useEffect } from "react";
import { useChatRoom, User } from "./actions/useChatRoom";

import { PaintCanvasHandle } from "./components/PaintCanvas";
import { JoinScreen } from "./components/JoinScreen";
import { RoomHeader } from "./components/RoomHeader";
import { CanvasSection } from "./components/CanvasSection";
import { SidePanel } from "./components/SidePanel";
import { Archive } from "./components/Archive";

export const ChatRoom = ({ roomId }: { roomId: string }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const canvasHandleRef = useRef<PaintCanvasHandle>(null);

  //DB接続時は以下を使用する

  const {
    roomInfo,
    onlineUsers,
    chatMessages,
    saveStroke,
    sendChatMessage,
    handleStartGame,
    handleFinishGame,
  } = useChatRoom(roomId, currentUser, canvasHandleRef);

  //テスト用 ＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾
  // const roomInfo = {
  //   id: 1,
  //   name: "テスト部屋",
  //   is_active: true, // ★ここを false にすれば「待機画面」もテストできる！
  //   session_start_at: new Date().toISOString(),
  //   last_session_image_url: "https://placehold.jp/150x150.png", // ダミー画像
  //   last_session_json_url: null,
  // };

  // const onlineUsers = [
  //   { id: "me", name: "自分" },
  //   { id: "other", name: "テストユーザー" },
  // ];

  // const chatMessages = [
  //   {
  //     user_name: "テストユーザー",
  //     text: "こんにちは！",
  //     timestamp: Date.now(),
  //   },
  // ];

  // // ダミー関数 (コンソールに出すだけ)
  // const saveStroke = (stroke: any) => console.log("描画データ:", stroke);
  // const sendChatMessage = (text: string) => console.log("チャット送信:", text);
  // const handleStartGame = async () => alert("スタートボタンが押されました");
  // const handleFinishGame = async () => alert("終了ボタンが押されました");

  //ここまでテスト用 ＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾＾

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
    <div className="min-h-screen bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-4">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 justify-center">
        <div className="w-full max-w-5xl flex flex-col gap-4">
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
          <div className="hidden lg:block">
            <Archive roomInfo={roomInfo} />
          </div>
        </div>

        {/* サイドパネル */}
        <SidePanel
          currentUser={currentUser}
          onlineUsers={onlineUsers}
          chatMessages={chatMessages}
          onSendChat={sendChatMessage}
        />
        <div className="block lg:hidden">
          <Archive roomInfo={roomInfo} />
        </div>
      </div>
    </div>
  );
};
