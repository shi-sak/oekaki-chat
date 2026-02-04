"use client";

import { useRef } from "react";
import { PaintCanvas, PaintCanvasHandle } from "./components/PaintCanvas";
import { useChatRoom } from "./actions/useChatRoom"; // 作ったフックをインポート

export const ChatRoom = ({ roomId }: { roomId: string }) => {
  const canvasRef = useRef<PaintCanvasHandle>(null);

  const { saveStroke, resetRoom } = useChatRoom(roomId, canvasRef);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Room: {roomId}</h1>
        <button
          onClick={resetRoom}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          リセット
        </button>
      </div>

      <div className="border-2 border-gray-800 rounded-lg overflow-hidden shadow-lg bg-white">
        {/* onStrokeで saveStroke を呼ぶだけ */}
        <PaintCanvas ref={canvasRef} onStroke={saveStroke} />
      </div>
    </div>
  );
};
