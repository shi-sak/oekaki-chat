"use server";

import { verifyTurnstile } from "./verifyTurnstile";

import crypto from "crypto";

// Server Action (特権管理者) 用のクライアント
import { adminSupabase } from "@/lib/supabase/admin";

/**
 * ゲーム開始 (お掃除 & 30分タイマー始動)
 */
export async function startGame(roomId: string, token: string) {
  // 1. Tokenチェック
  const validation = await verifyTurnstile(token);
  if (!validation.success) {
    throw new Error("Bot verification failed");
  }

  // もし前のセッションの線が残っていたら、開始前に消しておく
  const { error: deleteError } = await adminSupabase
    .from("strokes")
    .delete()
    .eq("room_id", roomId);

  if (deleteError) throw new Error(deleteError.message);

  // 2. 部屋の状態を active にする
  const { error } = await adminSupabase
    .from("rooms")
    .update({
      is_active: true,
      session_start_at: new Date().toISOString(),
      //サムネをnullに？
      thumbnail_updated_at: null,
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
  publicUrl: string, // nullが入る可能性があるので型定義注意（string | null）
  finishToken: string,
) {
  // 認証用ファイルをダウンロード (中身を読む)
  const SECRET_BUCKET = process.env.SECRET_BUCKET ?? "";
  const lockFileName = `lock_${roomId}.json`;
  const { data, error } = await adminSupabase.storage
    .from(SECRET_BUCKET)
    .download(lockFileName);
  if (error || !data) {
    throw new Error("セッションが無効です（もう一度お試しください）");
  }
  //テキストをJSONに戻す
  const text = await data.text();
  const { secret, expiresAt } = JSON.parse(text);
  // チェック開始
  // 期限切れチェック
  if (Date.now() > expiresAt) {
    // ゴミ掃除してエラー
    await adminSupabase.storage.from(SECRET_BUCKET).remove([lockFileName]);
    throw new Error("有効期限切れです");
  }
  // 合言葉チェック (乗っ取り防止)
  if (secret !== finishToken) {
    throw new Error("不正なリクエストです");
  }
  // ファイルを削除 (使用済み)
  await adminSupabase.storage.from(SECRET_BUCKET).remove([lockFileName]);

  // 2. 部屋を閉じる & アーカイブ保存
  const { error: roomError } = await adminSupabase
    .from("rooms")
    .update({
      is_active: false,
      session_start_at: null, // 開始時刻をリセット
      last_session_image_url: publicUrl,
      last_session_ended_at: new Date().toISOString(),
    })
    .eq("id", roomId);

  if (roomError) throw new Error(roomError.message);

  // 3. 部屋の線を全削除
  // (finishGameで消し損ねても、次のstartGameで消える二段構え！)
  const { error: strokeError } = await adminSupabase
    .from("strokes")
    .delete()
    .eq("room_id", roomId);

  if (strokeError) throw new Error(strokeError.message);
}

export async function updateThumbnail(roomId: string) {
  // 認証などは省略 (RLSで守るか、簡易実装ならこれだけでOK)
  await adminSupabase
    .from("rooms")
    .update({
      thumbnail_updated_at: new Date().toISOString(),
    })
    .eq("id", roomId);
}

export async function getArchiveUploadUrl(
  roomId: string,
  token: string, // Turnstileトークン
  size: number, //画像サイズ
) {
  if (size > 20 * 1024 * 1024) {
    throw new Error("ファイルが大きすぎます");
  }

  // 1. Turnstileチェック (ここが防壁！)
  const validation = await verifyTurnstile(token);
  if (!validation.success) {
    throw new Error("Bot verification failed");
  }

  // 2. ファイルパスを決定
  const timestamp = Date.now();
  const filePath = `${roomId}/${timestamp}.png`;
  // 3. 署名付きURLを発行 (Admin権限で！)
  // これで「このパスになら書き込んでいいよ」というURLが生成されます
  const { data, error } = await adminSupabase.storage
    .from("archives")
    .createSignedUploadUrl(filePath);

  if (error) throw new Error(error.message);

  // ★★★ ロックファイル作成 ★★★

  // 1. 合言葉を作る
  const secret = crypto.randomUUID();

  // 2. 有効期限を決める (5分後)
  const expiresAt = Date.now() + 5 * 60 * 1000;

  // 3. 固定ファイル名で保存
  // 拡張子を .json にしておくと中身の扱いが楽です
  const lockFileName = `lock_${roomId}.json`;

  const fileContent = JSON.stringify({ secret, expiresAt });

  // 上書きアップロード (upsert: true)
  // これなら前回のゴミが残っていても無視して新しいロックをかけられます
  const bucket = process.env.SECRET_BUCKET ?? "";
  await adminSupabase.storage.from(bucket).upload(lockFileName, fileContent, {
    contentType: "application/json",
    upsert: true,
  });

  return {
    signedUrl: data.signedUrl, // アップロード用の一時URL (token付き)
    path: data.path, // 保存されるパス (あとでDB保存に使う)
    publicUrl: adminSupabase.storage.from("archives").getPublicUrl(data.path)
      .data.publicUrl, // 閲覧用URL
    finishToken: secret,
  };
}
