import { RefObject } from "react";
import { Download } from "lucide-react";
import { PaintCanvas, PaintCanvasHandle } from "../components/PaintCanvas";
import { Room } from "../actions/useChatRoom";
import { CanvasPath } from "react-sketch-canvas";

type Props = {
  canvasHandleRef: RefObject<PaintCanvasHandle | null>; // null許容型に合わせる
  roomInfo: Room | null;
  onStroke: (stroke: CanvasPath) => void;
};

export const CanvasSection = ({
  canvasHandleRef,
  roomInfo,
  onStroke,
}: Props) => {
  const isActive = roomInfo?.is_active;

  return (
    <div className="flex-1 flex flex-col gap-4">
      {/* キャンバス本体 */}
      <div className="relative border-4 border-gray-800 rounded-xl overflow-hidden shadow-lg bg-white h-[600px]">
        <PaintCanvas
          ref={canvasHandleRef}
          onDrawEnd={onStroke}
          disabled={!isActive}
        />

        {!isActive && (
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none">
            <p className="bg-white/90 px-6 py-3 rounded-full font-bold text-gray-600 shadow-lg">
              開始ボタンを押すと描けるようになります
            </p>
          </div>
        )}
      </div>

      {/* アーカイブ表示 */}
      {roomInfo?.last_session_image_url && (
        <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
          <img
            src={roomInfo.last_session_image_url}
            className="w-24 h-24 object-cover rounded border"
            alt="前回の作品"
          />
          <div className="flex-1">
            <p className="font-bold text-gray-700 mb-1">前回の作品</p>
            <div className="flex gap-2 text-sm">
              <a
                href={roomInfo.last_session_image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Download size={14} /> 画像DL
              </a>
              <a
                href={roomInfo.last_session_json_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                <Download size={14} /> データDL
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
