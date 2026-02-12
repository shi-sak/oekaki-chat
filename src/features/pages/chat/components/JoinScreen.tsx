import { useState } from "react";
import Link from "next/link"; // ★追加
import { Loader2, ArrowLeft } from "lucide-react"; // ★ArrowLeft追加
import { Turnstile } from "@marsidev/react-turnstile";
import { verifyTurnstile } from "../actions/verifyTurnstile";

type Props = {
  onJoin: (name: string) => void;
};

export const JoinScreen = ({ onJoin }: Props) => {
  const [inputName, setInputName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!inputName.trim() || !token || isVerifying) return;

    setIsVerifying(true);

    const result = await verifyTurnstile(token);

    if (result.success) {
      onJoin(inputName);
    } else {
      alert("認証に失敗しました。もう一度お試しください。");
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl border-4 border-gray-800 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] w-full max-w-md relative" // relativeを追加
      >
        {/* タイトル */}
        <h2 className="text-2xl font-black mb-6 text-center text-gray-800 tracking-tight">
          お絵描きに参加
        </h2>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2 text-gray-700">
            お名前
          </label>
          <input
            type="text"
            className="w-full border-2 border-gray-800 p-4 rounded-xl text-lg font-bold focus:bg-yellow-50 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] transition-all placeholder-gray-300 text-gray-800"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="お名前"
            maxLength={10}
            required
          />
        </div>

        {/* Turnstile */}
        <div className="mb-6 flex justify-center">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ""}
            onSuccess={(token) => setToken(token)}
            options={{
              theme: "light",
              size: "normal",
            }}
          />
        </div>

        {/* 入室ボタン */}
        <button
          disabled={!token || isVerifying || !inputName.trim()}
          className="w-full bg-blue-500 text-white text-xl py-4 rounded-xl font-black border-2 border-gray-800 hover:bg-blue-600 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mb-6"
        >
          {isVerifying ? (
            <>
              <Loader2 className="animate-spin" /> VERIFYING...
            </>
          ) : (
            "入室する"
          )}
        </button>

        {/* ★ここに追加: TOPへ戻るリンク */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 font-bold hover:text-gray-800 transition-colors text-sm"
          >
            <ArrowLeft size={16} strokeWidth={3} />
            トップページに戻る
          </Link>
        </div>
      </form>
    </div>
  );
};
