import { Download, Image as ImageIcon, Clock } from "lucide-react";
import { Room } from "../actions/useChatRoom";

type Props = {
  roomInfo: Room | null;
};

export const Archive = ({ roomInfo }: Props) => {
  // データがない、または終了時間が記録されていない場合は非表示
  if (!roomInfo?.last_session_image_url || !roomInfo.last_session_ended_at) {
    return null;
  }

  // 時間計算
  const endedAt = new Date(roomInfo.last_session_ended_at).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - endedAt) / (1000 * 60);
  const remainingMinutes = Math.max(0, 30 - Math.floor(diffMinutes));

  // 30分経過していたら非表示
  if (diffMinutes >= 30) return null;

  return (
    // 以前のスタイルに戻す (border-gray-800, shadowも黒系)
    <div className="bg-white p-4 rounded-xl border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex items-start gap-4 animate-in fade-in slide-in-from-bottom-4">
      {/* サムネイル */}
      <div className="relative group shrink-0">
        <img
          src={roomInfo.last_session_image_url}
          className="w-24 h-24 object-cover rounded-lg border-2 border-gray-800 bg-gray-100"
          alt="前回の作品"
        />
        {/* 残り時間オーバーレイ*/}
        <div className="absolute bottom-0 left-0 w-full bg-gray-900/80 text-white text-[10px] text-center py-0.5 rounded-b-md flex items-center justify-center gap-1">
          <Clock size={10} /> 残り {remainingMinutes} 分
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {/* タイトルエリア */}
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-1">
            <ImageIcon size={18} className="text-gray-700" />
            <p className="font-bold text-gray-800">前回の作品</p>
          </div>
        </div>

        {/* ダウンロードボタン */}
        <div className="mb-2">
          <a
            href={roomInfo.last_session_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border-2 border-blue-200 hover:bg-blue-100 hover:border-blue-400 font-bold transition-all text-sm"
          >
            <Download size={14} /> 画像を保存する
          </a>
        </div>
      </div>
    </div>
  );
};
