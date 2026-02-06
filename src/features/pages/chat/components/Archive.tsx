import { Download, Image as ImageIcon } from "lucide-react";
import { Room } from "../actions/useChatRoom";

type Props = {
  roomInfo: Room | null;
};

export const Archive = ({ roomInfo }: Props) => {
  if (!roomInfo?.last_session_image_url) return null;

  return (
    <div className="bg-white p-4 rounded-xl border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
      {/* サムネイル */}
      <div className="relative group cursor-pointer">
        <img
          src={roomInfo.last_session_image_url}
          className="w-24 h-24 object-cover rounded-lg border-2 border-gray-800 bg-gray-100"
          alt="前回の作品"
        />
        {/* ホバー時に拡大アイコンとか出すとリッチかも（今回はシンプルに） */}
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon size={18} className="text-gray-700" />
          <p className="font-bold text-gray-800">前回の作品</p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <a
            href={roomInfo.last_session_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-400 font-bold transition-all"
          >
            <Download size={14} /> 画像DL
          </a>

          {roomInfo.last_session_json_url && (
            <a
              href={roomInfo.last_session_json_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg border-2 border-gray-200 hover:bg-gray-100 hover:border-gray-400 font-bold transition-all"
            >
              <Download size={14} /> データDL
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
