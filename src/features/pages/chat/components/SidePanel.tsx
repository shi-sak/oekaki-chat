import { useState } from "react";
import { Users, Send } from "lucide-react";
import { User, ChatMessage } from "../actions/useChatRoom";

type Props = {
  currentUser: User;
  onlineUsers: User[];
  chatMessages: ChatMessage[];
  onSendChat: (text: string) => void;
};

export const SidePanel = ({
  currentUser,
  onlineUsers,
  chatMessages,
  onSendChat,
}: Props) => {
  const [chatInput, setChatInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSendChat(chatInput);
    setChatInput("");
  };

  return (
    <div className="lg:w-80 w-full flex flex-col gap-4 h-[600px]">
      {/* 参加者リスト */}
      <div className="bg-white p-4 rounded-lg shadow-sm h-1/3 overflow-y-auto">
        <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2 border-b pb-2">
          <Users size={18} />
          参加者 ({onlineUsers.length})
        </h3>
        <ul className="space-y-2">
          {onlineUsers.map((u, i) => (
            <li
              key={`${u.id}-${i}`}
              className="flex items-center gap-2 text-sm"
            >
              <span
                className={`w-2 h-2 rounded-full ${u.id === currentUser.id ? "bg-blue-500" : "bg-green-500"}`}
              />
              <span className={u.id === currentUser.id ? "font-bold" : ""}>
                {u.name} {u.id === currentUser.id && "(自分)"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* チャットエリア */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden">
        <h3 className="font-bold text-gray-700 mb-2 border-b pb-2">チャット</h3>

        <div className="flex-1 overflow-y-auto space-y-3 mb-3 p-2 bg-gray-50 rounded">
          {chatMessages.length === 0 && (
            <p className="text-center text-xs text-gray-400 mt-4">
              まだメッセージはありません
            </p>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className="flex flex-col text-sm">
              <span className="font-bold text-xs text-gray-600">
                {msg.user_name}
              </span>
              <span className="bg-white p-2 rounded shadow-sm border">
                {msg.text}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            className="flex-1 border p-2 rounded text-sm outline-none focus:border-blue-500"
            placeholder="メッセージ..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition">
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
