"use client";

import { X } from "lucide-react";

type Props = {
  onClose: () => void;
};

export const TermsModal = ({ onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      {/* 外枠*/}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] border-2 border-gray-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー*/}
        <div className="bg-white/95 backdrop-blur border-b p-4 flex justify-between items-center z-10 shrink-0">
          <h2 className="font-bold text-lg text-gray-800">
            利用規約・免責事項・プライバシーポリシー
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 本文エリア */}
        <div className="p-6 space-y-8 text-sm leading-relaxed text-gray-600 overflow-y-auto">
          <section>
            <h3 className="font-bold text-gray-800 text-base mb-2 border-l-4 border-black pl-3">
              1. 投稿コンテンツについて
            </h3>
            <p>
              当サイトは誰でも自由に投稿できる掲示板ですが、以下のコンテンツの投稿を禁止します。
              <br />
              発見次第、管理人の判断で予告なく削除する場合があります。
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 bg-gray-50 p-3 rounded-lg">
              <li>法令に違反するもの、またはその恐れのあるもの</li>
              <li>過度にわいせつな表現、暴力的・残虐な表現</li>
              <li>第三者を誹謗中傷する内容</li>
              <li>スパム、荒らし行為</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-gray-800 text-base mb-2 border-l-4 border-black pl-3">
              2. 免責事項
            </h3>
            <p>
              当サイトを利用したことによって生じた、いかなる損害についても管理人は責任を負いません。
              <br />
              また、サービスは予告なく停止・終了する場合があります。
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-800 text-base mb-2 border-l-4 border-black pl-3">
              3. プライバシーポリシー
            </h3>
            <p>
              当サイトではセキュリティ対策のため Cloudflare Turnstile
              を使用しています。
              <br />
              また、ブラウザにCookie等のデータを保存する場合があります。
              <br />
              <span className="text-xs text-gray-400">
                （広告や追跡目的ではありません）
              </span>
            </p>
          </section>

          {/* フッター的なボタンエリア */}
          <div className="pt-6 border-t text-center">
            <button
              onClick={onClose}
              className="bg-black text-white font-bold py-3 px-8 rounded-full hover:bg-gray-800 transition-transform active:scale-95 shadow-lg"
            >
              トップページに戻る（閉じる）
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
