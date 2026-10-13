-- =====================================================================
-- お絵描きチャット: 時間切れの部屋を自動で閉じる (保険)
--
-- 普段は部屋にいる代表者のブラウザが60分で終了処理をしますが、
-- 誰もいない・終了処理に失敗した、という時のために DB 側で1分ごとにチェックします。
-- (この場合は画像を作れないので、「前回の作品」は出ません)
--
-- 1. ダッシュボード → Integrations → Cron を有効化 (pg_cron)
-- 2. SQL Editor でこのファイルを実行
-- =====================================================================

create extension if not exists pg_cron with schema pg_catalog;

-- 開始から65分 (制限60分 + 代表者が終了処理をする猶予5分) 過ぎても開いている部屋を閉じる
-- ※ ROOM_LIMIT_MINUTES (src/constants/canvas.ts) を変えたら、ここの 65 も変える
select cron.schedule(
  'oekaki-close-expired-rooms',
  '* * * * *',
  $$
  with closed as (
    update public.rooms
       set is_active = false,
           session_start_at = null,
           last_session_image_url = null,
           last_session_ended_at = now()
     where is_active
       and session_start_at < now() - interval '65 minutes'
    returning id
  )
  delete from public.strokes
   where room_id in (select id from closed);
  $$
);

-- 止めたい時: select cron.unschedule('oekaki-close-expired-rooms');
-- 実行履歴:   select * from cron.job_run_details order by start_time desc limit 10;
