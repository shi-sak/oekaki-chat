import { useState } from "react";
import { Play, StopCircle, Hash, Loader2 } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile"; // ★追加
import { Room } from "../actions/useChatRoom";

type Props = {
  roomId: string;
  roomInfo: Room | null;
  // ここで token を受け取る形になっているので、呼び出し側もそれに合わせます
  onStart: (token: string) => Promise<void>;
  onFinish: (token: string) => Promise<void>;
};

export const RoomHeader = ({ roomId, roomInfo, onStart, onFinish }: Props) => {
  const isActive = roomInfo?.is_active;

  // ★追加: 認証中かどうか
  const [isVerifying, setIsVerifying] = useState(false);
  // ★追加: どっちのボタンを押したか ("start" | "finish" | null)
  const [actionType, setActionType] = useState<"start" | "finish" | null>(null);

  // 1. ボタンが押されたら「認証モード」にする
  const handleActionClick = (type: "start" | "finish") => {
    setActionType(type);
    setIsVerifying(true);
  };

  // 2. Turnstileが成功したら呼ばれる関数
  const handleTurnstileSuccess = async (token: string) => {
    try {
      if (actionType === "start") {
        await onStart(token); // ここでトークンを渡して実行！
      } else if (actionType === "finish") {
        await onFinish(token); // ここでトークンを渡して実行！
      }
    } catch (e) {
      console.error(e);
      alert("処理に失敗しました");
    } finally {
      // リセット
      setIsVerifying(false);
      setActionType(null);
    }
  };

  return (
    <div className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border-2 border-gray-800 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] overflow-hidden relative">
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
      <div className="flex gap-2 items-center relative">
        {/* ================================================== 
            ★ ここにTurnstileを入れます！
            認証中はボタンの上に「検証中...」と表示して操作を防ぎます
           ================================================== */}
        {isVerifying && (
          <div className="absolute inset-0 bg-white/90 z-10 flex items-center justify-center gap-2 rounded-lg">
            <Loader2 className="animate-spin text-gray-600" size={20} />
            <span className="font-bold text-xs text-gray-600">Checking...</span>

            {/* 見えない状態でTurnstileを配置して、自動的にチェックを走らせます */}
            <div className="opacity-0 w-0 h-0 overflow-hidden">
              <Turnstile
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={handleTurnstileSuccess}
                options={{ size: "compact" }}
              />
            </div>
          </div>
        )}

        {!isActive ? (
          <button
            // ★ onStartを直接呼ばず、handleActionClick を呼ぶ
            onClick={() => handleActionClick("start")}
            disabled={isVerifying}
            className="flex items-center gap-2 bg-green-500 text-white font-bold px-6 py-2 rounded-lg border-2 border-gray-800 hover:bg-green-600 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
          >
            <Play size={20} strokeWidth={3} /> スタート
          </button>
        ) : (
          <button
            // ★ onFinishを直接呼ばず、handleActionClick を呼ぶ
            onClick={() => handleActionClick("finish")}
            disabled={isVerifying}
            className="flex items-center gap-2 bg-red-500 text-white font-bold px-6 py-2 rounded-lg border-2 border-gray-800 hover:bg-red-600 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50"
          >
            <StopCircle size={20} strokeWidth={3} /> 終了
          </button>
        )}
      </div>
    </div>
  );
};
