-- Run only after enabling the pg_cron extension in Supabase Database > Extensions.
-- 17:05 UTC = 00:05 the next day in Asia/Bangkok (UTC+7 year-round).
-- Scheduled execution archives all task_date values before today's Bangkok date.
select cron.schedule('my-day-archive','5 17 * * *', $$select public.archive_past_daily_tasks();$$);
-- To stop later: select cron.unschedule('my-day-archive');
-- To archive manually (permanently deletes past task rows):
-- select public.archive_past_daily_tasks();
