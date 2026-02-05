"use server";

import { createClient } from "@supabase/supabase-js";

// Server Action (特権管理者) 用のクライアント
// ※ クライアント側では絶対に使わないこと！
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
);

/**
 * ゲーム開始 (30分タイマー始動)
 */
export async function startGame(roomId: string) {
  // バリデーション: 既に始まってたら無視するなども可能
  const { error } = await adminSupabase
    .from("rooms")
    .update({
      is_active: true,
      session_start_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (error) throw new Error(error.message);
}

/**
 * ゲーム終了 & アーカイブ & リセット
 * (クライアントからJSON/画像のURLを受け取って保存する)
 */
export async function finishGame(
  roomId: string,
  jsonUrl: string,
  imageUrl: string,
) {
  // 1. 部屋を閉じる & アーカイブ保存
  const { error: roomError } = await adminSupabase
    .from("rooms")
    .update({
      is_active: false,
      session_start_at: null,
      last_session_json_url: jsonUrl,
      last_session_image_url: imageUrl,
      last_session_ended_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (roomError) throw new Error(roomError.message);

  // 2. 部屋の線を全削除 (Deleteポリシーがないので、この管理者権限でのみ削除可能)
  const { error: strokeError } = await adminSupabase
    .from("strokes")
    .delete()
    .eq("room_id", roomId);

  if (strokeError) throw new Error(strokeError.message);
}

/**
 * サムネイル更新
 * (クライアントが描画中に適当なタイミングで送ってくる)
 */
export async function updateThumbnail(roomId: string, thumbnailUrl: string) {
  await adminSupabase
    .from("rooms")
    .update({
      thumbnail_url: thumbnailUrl,
      thumbnail_updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);
}
