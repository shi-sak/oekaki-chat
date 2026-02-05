import React, { useState } from "react";

type Props = {
  onJoin: (name: string) => void;
};

export const JoinScreen = ({ onJoin }: Props) => {
  const [inputName, setInputName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) onJoin(inputName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          お絵描きに参加
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-bold mb-2 text-gray-700">
            ニックネーム
          </label>
          <input
            type="text"
            className="w-full border-2 border-gray-300 p-3 rounded-lg focus:border-blue-500 outline-none"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="例: 画伯"
            maxLength={10}
            required
          />
        </div>
        <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
          入室する
        </button>
      </form>
    </div>
  );
};
