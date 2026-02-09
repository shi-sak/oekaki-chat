import { createClient } from "@supabase/supabase-js";

// 注意: このファイルは絶対に "use client" のファイルから import してはいけません！
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY!;

export const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false, // サーバーサイドなのでセッション維持は不要
  },
});
