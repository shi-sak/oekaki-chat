import { Play, StopCircle, Hash } from "lucide-react";
import { Room } from "../actions/useChatRoom";

type Props = {
  roomId: string;
  roomInfo: Room | null;
  onStart: () => void;
  onFinish: () => void;
};

export const RoomHeader = ({ roomId, roomInfo, onStart, onFinish }: Props) => {
  const isActive = roomInfo?.is_active;

  return (
    <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)]">
      {/* 部屋情報 */}
      <div className="flex items-center gap-4">
        <div className="bg-gray-100 p-2 rounded-lg border-2 border-gray-800">
          <Hash size={24} className="text-gray-700" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-800 tracking-tight">
            Room: {roomId}
          </h1>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className="text-gray-500">Status:</span>
            {isActive ? (
              <span className="text-green-600 bg-green-100 px-2 py-0.5 rounded border border-green-200 animate-pulse">
                OPEN
              </span>
            ) : (
              <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                CLOSE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        {!isActive ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-2 rounded-lg border-2 border-gray-800 hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
          >
            <Play size={20} strokeWidth={3} /> スタート
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="flex items-center gap-2 bg-red-500 text-white font-bold px-6 py-2 rounded-lg border-2 border-gray-800 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all"
          >
            <StopCircle size={20} strokeWidth={3} /> 終了して保存
          </button>
        )}
      </div>
    </div>
  );
};
