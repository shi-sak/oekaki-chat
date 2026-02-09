import { createContext, useContext } from "react";
import { Stroke } from "@/constants/canvas";

// ■ 配りたいものリスト
type RoomContextType = {
  onSaveStroke: (stroke: Stroke) => Promise<void>; // 線を保存する関数
  isRoomActive: boolean; // 部屋が開いてるか（書き込み許可判定用）
};

// ■ Contextの作成
const RoomContext = createContext<RoomContextType | null>(null);

// ■ カスタムフック（これを使うと便利！）
export const useRoomContext = () => {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error("useRoomContext must be used within a RoomProvider");
  }
  return context;
};

// ■ Providerコンポーネント（親で囲むやつ）
export const RoomProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: RoomContextType;
}) => {
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};
