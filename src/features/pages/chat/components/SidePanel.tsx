import { useState, useRef, useEffect } from "react";
import { Users, Send, MessageSquare } from "lucide-react";
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // チャットが更新されたら自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSubmit = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput("");
  };

  return (
    <div className="lg:w-80 w-full flex flex-col gap-4 h-[600px]">
      {/* 👥 参加者リスト */}
      <div className="bg-white border-2 border-gray-800 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] h-1/3 flex flex-col overflow-hidden">
        <div className="bg-gray-100 border-b-2 border-gray-800 p-3 flex items-center gap-2">
          <Users size={18} className="text-gray-700" />
          <h3 className="font-bold text-gray-800">
            参加者 ({onlineUsers.length})
          </h3>
        </div>

        <ul className="p-3 space-y-2 overflow-y-auto flex-1">
          {onlineUsers.map((u, i) => (
            <li
              key={`${u.id}-${i}`}
              className={`flex items-center gap-2 text-sm p-2 rounded border-2 ${
                u.id === currentUser.id
                  ? "bg-blue-50 border-blue-800 text-blue-900 font-bold"
                  : "bg-white border-transparent text-gray-800"
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full border border-gray-800 ${
                  u.id === currentUser.id ? "bg-blue-500" : "bg-green-500"
                }`}
              />
              <span className="truncate">
                {u.name} {u.id === currentUser.id && "(自分)"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* 💬 チャットエリア */}
      <div className="bg-white border-2 border-gray-800 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex-1 flex flex-col overflow-hidden">
        <div className="bg-gray-100 border-b-2 border-gray-800 p-3 flex items-center gap-2">
          <MessageSquare size={18} className="text-gray-700" />
          <h3 className="font-bold text-gray-800">チャット</h3>
        </div>

        {/* メッセージ一覧 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {chatMessages.length === 0 && (
            <p className="text-center text-xs text-gray-400 mt-4">
              まだメッセージはありません
            </p>
          )}
          {chatMessages.map((msg, i) => {
            const isMe = msg.user_name === currentUser.name;
            return (
              <div
                key={i}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-gray-500 mb-1 px-1 font-bold">
                  {msg.user_name}
                </span>
                <div
                  className={`max-w-[85%] p-2 rounded-lg text-sm border-2 border-gray-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] ${
                    isMe ? "bg-blue-500 text-white" : "bg-white text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* 入力フォーム */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-white border-t-2 border-gray-800 flex gap-2"
        >
          <input
            type="text"
            className="flex-1 border-2 border-gray-300 p-2 rounded-lg text-sm outline-none focus:border-gray-800 focus:bg-gray-50 transition-colors text-gray-700 placeholder-gray-400"
            placeholder="メッセージ..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button
            type="submit"
            className="bg-gray-800 text-white p-2.5 rounded-lg hover:bg-gray-700 transition active:translate-y-1 active:shadow-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
};
