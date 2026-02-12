export const RoomListSkeleton = () => {
  const items = [1, 2];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl overflow-hidden shadow-sm border-2 border-transparent"
        >
          {/* 画像部分のスケルトン */}
          <div className="aspect-video bg-gray-200 animate-pulse w-full" />

          {/* テキスト部分のスケルトン */}
          <div className="p-5 space-y-3">
            {/* タイトル風 */}
            <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
            {/* ステータス風 */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
