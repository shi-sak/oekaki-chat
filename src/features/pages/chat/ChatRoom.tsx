"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { useChatRoom, User } from "./actions/useChatRoom";

import { useRouter } from "next/navigation";

import { RoomProvider } from "./contexts/RoomContext";

import { PaintCanvasHandle } from "./components/PaintCanvas";
import { JoinScreen } from "./components/JoinScreen";
import { RoomHeader } from "./components/RoomHeader";
import { CanvasSection } from "./components/CanvasSection";
import { SidePanel } from "./components/SidePanel";
import { Archive } from "./components/Archive";
import { ResultModal } from "./components/ResultModal";

export const ChatRoom = ({ roomId }: { roomId: string }) => {
  //ユーザ情報
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  //キャンバス情報
  const canvasHandleRef = useRef<PaintCanvasHandle>(null);
  //終了時の画像
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  //Router
  const router = useRouter();

  //DB接続時は以下を使用する
  const {
    roomInfo,
    onSaveStroke,
    onlineUsers,
    chatMessages,
    sendChatMessage,
    handleStartGame,
    handleFinishGame,
  } = useChatRoom(roomId, currentUser, canvasHandleRef);

  // Context
  const roomContextValue = useMemo(
    () => ({
      onSaveStroke,
      isRoomActive: roomInfo?.is_active ?? false,
    }),
    [onSaveStroke, roomInfo?.is_active],
  );

  // ユーザー判定 (初回ロード時)
  useEffect(() => {
    const savedName = sessionStorage.getItem(`oekaki_name_${roomId}`);
    const savedId = sessionStorage.getItem(`oekaki_id_${roomId}`);
    if (savedName && savedId) {
      setCurrentUser({ id: savedId, name: savedName });
    }
  }, [roomId]);

  // 参加処理
  const handleJoin = (name: string) => {
    const newUser = { id: crypto.randomUUID(), name };
    sessionStorage.setItem(`oekaki_name_${roomId}`, newUser.name);
    sessionStorage.setItem(`oekaki_id_${roomId}`, newUser.id);
    setCurrentUser(newUser);
  };

  // ■ 退出処理 (ログアウト)
  const handleLogout = () => {
    if (!confirm("退出しますか？\n（キャンバスの内容は保持されます）")) return;

    // セッション削除
    sessionStorage.removeItem(`oekaki_name_${roomId}`);
    sessionStorage.removeItem(`oekaki_id_${roomId}`);

    router.push("/");
  };

  // ■ 終了ボタン処理 (ラッパー)
  // RoomHeader から token を受け取って実行します
  // ★ 第2引数 isAuto を追加
  const handleFinishWrapper = async (
    token: string,
    isAuto: boolean = false,
  ) => {
    // 自動じゃない時だけ確認ダイアログを出す
    if (!isAuto) {
      if (!confirm("終了しますか？")) return;
    }

    if (!canvasHandleRef.current) return;

    try {
      // 1. まず現在のキャンバスを画像(Blob)として取得
      const blob = await canvasHandleRef.current.exportImageBlob("png");
      if (!blob) throw new Error("画像の生成に失敗しました");

      // 2. 即座にユーザーに見せるためにURL化してモーダル表示 (UX向上)
      const previewUrl = URL.createObjectURL(blob);
      setResultImageUrl(previewUrl);

      // 3. 裏側でサーバーへの保存処理を実行 (useChatRoomの関数)
      await handleFinishGame(token);
    } catch (e) {
      console.error(e);
      alert("終了処理中にエラーが発生しましたが、手元の画像は保存可能です。");
    }
  };

  // 名前未入力なら参加画面へ
  if (!currentUser) {
    return <JoinScreen onJoin={handleJoin} />;
  }

  return (
    <RoomProvider value={roomContextValue}>
      <div className="min-h-screen bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-4">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 justify-center">
          <div className="w-full max-w-5xl flex flex-col gap-4">
            <RoomHeader
              roomId={roomId}
              roomInfo={roomInfo}
              onStart={handleStartGame}
              onFinish={handleFinishWrapper} // 関数を渡す
            />
            <CanvasSection
              canvasHandleRef={canvasHandleRef}
              roomInfo={roomInfo}
            />
            {/* PC版アーカイブ */}
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
            onLogout={handleLogout}
          />
          {/* スマホ版アーカイブ */}
          <div className="block lg:hidden">
            <Archive roomInfo={roomInfo} />
          </div>
        </div>
      </div>
      {/* ★ 結果発表モーダル (stateにURLが入ったら表示) */}
      {resultImageUrl && (
        <ResultModal
          imageUrl={resultImageUrl}
          onClose={() => setResultImageUrl(null)}
        />
      )}
    </RoomProvider>
  );
};
