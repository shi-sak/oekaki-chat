"use server";

import { verifyTurnstile } from "./verifyTurnstile";

import crypto from "crypto";

// Server Action (特権管理者) 用のクライアント
import { adminSupabase } from "@/lib/supabase/admin";
import { ROOM_LIMIT_MINUTES } from "@/constants/canvas";

// ※ "use server" のファイルで export した関数は、画面のボタンを通さなくても
//    誰でも直接呼び出せる API になる。export するものは中で必ずチェックすること。

const ARCHIVE_BUCKET = "archives";
// 端末の時計が少し進んでいても自動終了できるよう、1分早めから「時間切れ」とみなす
const TIME_UP_TOLERANCE_MS = 60 * 1000;

/**
 * ゲーム開始 (お掃除 & 30分タイマー始動)
 */
export async function startGame(roomId: string, token: string) {
  // 1. Tokenチェック
  const validation = await verifyTurnstile(token);
  if (!validation.success) {
    throw new Error("Bot verification failed");
  }

  // 開催中の部屋では何もしない (開催中の線を消されないように)
  const { data: room } = await adminSupabase
    .from("rooms")
    .select("is_active")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) throw new Error("Room not found");
  if (room.is_active) throw new Error("すでに開始されています");

  // もし前のセッションの線が残っていたら、開始前に消しておく
  const { error: deleteError } = await adminSupabase
    .from("strokes")
    .delete()
    .eq("room_id", roomId);

  if (deleteError) throw new Error(deleteError.message);

  // 2. 部屋の状態を active にする (同時に押された時は、先に通った1人だけ成功)
  const { data: started, error } = await adminSupabase
    .from("rooms")
    .update({
      is_active: true,
      session_start_at: new Date().toISOString(),
      //サムネをnullに？
      thumbnail_updated_at: null,
    })
    .eq("id", roomId)
    .eq("is_active", false)
    .select("id");

  if (error) throw new Error(error.message);
  if (!started?.length) throw new Error("すでに開始されています");
}

/**
 * ゲーム終了 & アーカイブ & リセット
 * (画像は getArchiveUploadUrl で発行したURLにアップロード済みの前提)
 */
export async function finishGame(roomId: string, finishToken: string) {
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
  const { secret, expiresAt, path, sessionStartAt } = JSON.parse(text);
  if (!path || !sessionStartAt) {
    throw new Error("セッションが無効です（もう一度お試しください）");
  }
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

  // 画像のURLはサーバー側で決める (クライアントから受け取ったURLは信用しない)
  // アップロードされていなければ、画像なしで終了する
  const { data: uploaded } = await adminSupabase.storage
    .from(ARCHIVE_BUCKET)
    .exists(path);
  const publicUrl = uploaded
    ? adminSupabase.storage.from(ARCHIVE_BUCKET).getPublicUrl(path).data
        .publicUrl
    : null;

  // 2. 部屋を閉じる & アーカイブ保存
  // (許可証を出した時と同じセッションの時だけ。終了→再開のあとに古い終了が届いても閉じない)
  const { data: closed, error: roomError } = await adminSupabase
    .from("rooms")
    .update({
      is_active: false,
      session_start_at: null, // 開始時刻をリセット
      last_session_image_url: publicUrl,
      last_session_ended_at: new Date().toISOString(),
    })
    .eq("id", roomId)
    .eq("is_active", true)
    .eq("session_start_at", sessionStartAt)
    .select("id");

  if (roomError) throw new Error(roomError.message);
  if (!closed?.length) return; // すでに終了済み (次のセッションの線は消さない)

  // 3. 部屋の線を全削除
  // (finishGameで消し損ねても、次のstartGameで消える二段構え！)
  const { error: strokeError } = await adminSupabase
    .from("strokes")
    .delete()
    .eq("room_id", roomId);

  if (strokeError) throw new Error(strokeError.message);
}

// ※ export しない (export すると誰でも直接呼べてしまう)
async function updateThumbnail(roomId: string) {
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

  // 開催中の部屋だけ
  const { data: room } = await adminSupabase
    .from("rooms")
    .select("is_active, session_start_at")
    .eq("id", roomId)
    .maybeSingle();
  if (!room?.is_active || !room.session_start_at) {
    throw new Error("開催中ではありません");
  }

  // 1. Turnstileチェック (ここが防壁！)
  //    ただし制限時間を過ぎていれば自動終了なので、トークンなしでOK
  const endsAt =
    new Date(room.session_start_at).getTime() + ROOM_LIMIT_MINUTES * 60 * 1000;
  const isTimeUp = Date.now() >= endsAt - TIME_UP_TOLERANCE_MS;
  if (!isTimeUp) {
    const validation = await verifyTurnstile(token);
    if (!validation.success) {
      throw new Error("Bot verification failed");
    }
  }

  // 2. ファイルパスを決定
  const timestamp = Date.now();
  const filePath = `${roomId}/${timestamp}.png`;
  // 3. 署名付きURLを発行 (Admin権限で！)
  // これで「このパスになら書き込んでいいよ」というURLが生成されます
  const { data, error } = await adminSupabase.storage
    .from(ARCHIVE_BUCKET)
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

  // 保存先のパスと、どのセッションの終了かも一緒に覚えておく (finishGame で使う)
  const fileContent = JSON.stringify({
    secret,
    expiresAt,
    path: data.path,
    sessionStartAt: room.session_start_at,
  });

  // 上書きアップロード (upsert: true)
  // これなら前回のゴミが残っていても無視して新しいロックをかけられます
  const bucket = process.env.SECRET_BUCKET ?? "";
  const { error: lockError } = await adminSupabase.storage
    .from(bucket)
    .upload(lockFileName, fileContent, {
      contentType: "application/json",
      upsert: true,
    });
  if (lockError) throw new Error(lockError.message);

  return {
    signedUrl: data.signedUrl, // アップロード用の一時URL (token付き)
    finishToken: secret,
  };
}

//サムネイルアップロード(軽いのでサーバを通す)
export async function uploadThumbnailAction(
  roomId: string,
  formData: FormData,
) {
  try {
    const file = formData.get("file") as File;
    if (!file) throw new Error("No file uploaded");
    if (file.size > 500 * 1024) {
      return {
        success: false,
        error: "ファイルサイズが大きすぎます (上限500KB)",
      };
    }

    // 1. 部屋が本当に存在して、アクティブかチェック (セキュリティ)
    const { data: room, error: roomError } = await adminSupabase
      .from("rooms")
      .select("thumbnail_updated_at, is_active")
      .eq("id", roomId)
      .single();

    if (roomError || !room) throw new Error("Room not found");
    if (!room.is_active) throw new Error("Room is finished");

    //API連打対策 4分は経っててほしい
    const lastUpdate = new Date(room.thumbnail_updated_at).getTime();
    const now = Date.now();
    if (now - lastUpdate < 4 * 60 * 1000) {
      return { success: false, error: "Too many requests" };
    }

    // 2. ArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 中身が本当に画像かチェック (ブラウザによっては WebP を作れず PNG になるので両方OK)
    const contentType = detectImageType(buffer);
    if (!contentType) {
      return { success: false, error: "画像の形式が不正です" };
    }

    // 3. Admin権限で上書きアップロード (Upsert)
    // ※ポリシーを無視して書き込める
    const fileName = `room_${roomId}.webp`;
    const { error: uploadError } = await adminSupabase.storage
      .from("thumbnails")
      .upload(fileName, buffer, {
        contentType,
        upsert: true, //上書き許可
      });

    if (uploadError) throw uploadError;

    // DB反映
    await updateThumbnail(roomId);

    return { success: true };
  } catch (error) {
    console.error("Thumbnail upload failed:", error);
    return { success: false, error: "Upload failed" };
  }
}

// ファイルの先頭バイトから画像の種類を判定する
function detectImageType(buffer: Buffer) {
  const PNG_SIGNATURE = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") === PNG_SIGNATURE) {
    return "image/png";
  }
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}
