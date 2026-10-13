import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RoomNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] p-4">
      <div className="bg-white p-8 rounded-2xl border-4 border-gray-800 shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] w-full max-w-md text-center">
        <h2 className="text-2xl font-black mb-2 text-gray-800 tracking-tight">
          部屋が見つかりません
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          URLが間違っているか、部屋がなくなった可能性があります。
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 font-bold hover:text-gray-800 transition-colors text-sm"
        >
          <ArrowLeft size={16} strokeWidth={3} />
          トップページに戻る
        </Link>
      </div>
    </div>
  );
}
