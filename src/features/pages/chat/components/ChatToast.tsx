"use client";

import { ChatMessage } from "../actions/useChatRoom";

type Props = {
  message: ChatMessage | null;
};

export const ChatToast = ({ message }: Props) => {
  return (
    <div
      className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md transition-all duration-500 ease-in-out z-[9999] pointer-events-none ${
        message
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-8 opacity-0 scale-95"
      }`}
    >
      {message && (
        <div className="bg-gray-900/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-gray-700/50">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-bold mb-0.5 tracking-wider">
              {message.user_name}
            </p>
            <p className="text-base font-medium truncate leading-tight">
              {message.text}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};