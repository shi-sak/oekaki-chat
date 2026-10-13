-- =====================================================================
-- お絵描きチャット: DB のいたずら対策 (RLS / Storage)
--
-- Supabase ダッシュボード → SQL Editor に貼り付けて実行してください。
-- 何度実行しても同じ結果になります。
--
-- ※ サーバー (dbAction.ts) は secret key を使っていて RLS の対象外なので、
--    ここでブラウザからの書き込みを禁止しても、スタート・終了・サムネイル更新は動きます。
--
-- 実行前の確認用 (読むだけ):
--   select tablename, policyname, permissive, roles, cmd from pg_policies where schemaname in ('public', 'storage');
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets;
-- =====================================================================

begin;

-- ---------------------------------------------------------------
-- 1. RLS を有効化
-- ---------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.strokes enable row level security;

-- ---------------------------------------------------------------
-- 2. ブラウザ (publishable key) に許可すること: 部屋と線を読む・線を描く
--    (同じ内容の既存ポリシーがあっても、重なるだけで害はありません)
-- ---------------------------------------------------------------
drop policy if exists "oekaki: rooms are readable" on public.rooms;
create policy "oekaki: rooms are readable" on public.rooms
  for select to anon, authenticated
  using (true);

drop policy if exists "oekaki: strokes are readable" on public.strokes;
create policy "oekaki: strokes are readable" on public.strokes
  for select to anon, authenticated
  using (true);

drop policy if exists "oekaki: strokes are insertable" on public.strokes;
create policy "oekaki: strokes are insertable" on public.strokes
  for insert to anon, authenticated
  with check (true);

-- ---------------------------------------------------------------
-- 3. 制限 (restrictive)
--    restrictive は、既存のゆるいポリシーがあっても AND で必ず効きます
-- ---------------------------------------------------------------

-- 線を描けるのは開催中の部屋だけ & 巨大なデータは拒否
drop policy if exists "oekaki: strokes insert guard" on public.strokes;
create policy "oekaki: strokes insert guard" on public.strokes
  as restrictive
  for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = strokes.room_id and r.is_active
    )
    and pg_column_size(data) <= 1048576                       -- 1MB まで
    and jsonb_typeof(data::jsonb -> 'points') = 'array'
    and jsonb_array_length(data::jsonb -> 'points') <= 40000  -- 座標2万点まで
    and (data::jsonb ->> 'width')::numeric between 1 and 100  -- PEN_WIDTH (canvas.ts) と合わせる
  );

-- 線の書き換え・削除は禁止
drop policy if exists "oekaki: strokes no update" on public.strokes;
create policy "oekaki: strokes no update" on public.strokes
  as restrictive for update to anon, authenticated
  using (false);

drop policy if exists "oekaki: strokes no delete" on public.strokes;
create policy "oekaki: strokes no delete" on public.strokes
  as restrictive for delete to anon, authenticated
  using (false);

-- 部屋の作成・書き換え・削除は禁止
drop policy if exists "oekaki: rooms no insert" on public.rooms;
create policy "oekaki: rooms no insert" on public.rooms
  as restrictive for insert to anon, authenticated
  with check (false);

drop policy if exists "oekaki: rooms no update" on public.rooms;
create policy "oekaki: rooms no update" on public.rooms
  as restrictive for update to anon, authenticated
  using (false);

drop policy if exists "oekaki: rooms no delete" on public.rooms;
create policy "oekaki: rooms no delete" on public.rooms
  as restrictive for delete to anon, authenticated
  using (false);

-- ---------------------------------------------------------------
-- 4. Storage: 置けるファイルの種類とサイズを制限
-- ---------------------------------------------------------------
update storage.buckets
   set file_size_limit = 20971520,                         -- 20MB (dbAction.ts の上限と合わせる)
       allowed_mime_types = array['image/png']
 where id = 'archives';

update storage.buckets
   set file_size_limit = 524288,                           -- 512KB (サムネイルは500KBまで)
       allowed_mime_types = array['image/webp', 'image/png']
 where id = 'thumbnails';

commit;
