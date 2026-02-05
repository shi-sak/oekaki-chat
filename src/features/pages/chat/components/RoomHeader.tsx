import { Play, StopCircle } from "lucide-react";
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
    <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Room: {roomId}</h1>
        <p className="text-sm text-gray-500">
          Status:
          <span
            className={`ml-2 font-bold ${isActive ? "text-green-600" : "text-orange-500"}`}
          >
            {isActive ? "開催中 🔥" : "待機中 ☕"}
          </span>
        </p>
      </div>

      <div className="flex gap-2">
        {!isActive ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            <Play size={18} /> スタート
          </button>
        ) : (
          <button
            onClick={onFinish}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            <StopCircle size={18} /> 終了して保存
          </button>
        )}
      </div>
    </div>
  );
};
