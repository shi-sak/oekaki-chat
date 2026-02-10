// src/components/ResultModal.tsx
import React from "react";

type Props = {
  imageUrl: string;
  onClose: () => void;
};

export const ResultModal = ({ imageUrl, onClose }: Props) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
          <h2 className="text-xl font-bold text-gray-800 max-w-full">
            ( ᐢ. ̫ .ᐢ )終了( ᐢ. ̫ .ᐢ )
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex justify-center items-center">
          <img
            src={imageUrl}
            alt="Result"
            className="max-w-full h-auto shadow-lg rounded-md border"
          />
        </div>
        <div className="p-6 border-t bg-white flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href={imageUrl}
            download={`oekaki_${new Date().toISOString().slice(0, 10)}.png`}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full text-center transition shadow-lg flex items-center justify-center gap-2"
          >
            ⬇️ 画像を保存
          </a>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-full transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
