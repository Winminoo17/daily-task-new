-- Run in Supabase SQL Editor. Intended for a dedicated, private project.
create table if not exists public.tasks (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 task_date date not null default ((now() at time zone 'Asia/Bangkok')::date),
 title text not null check(length(trim(title)) between 1 and 180),
 description text not null default '',
 status text not null default 'todo' check (status in ('todo','done')),
 priority text not null default 'medium' check (priority in ('low','medium','high')),
 completed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists tasks_user_date_idx on public.tasks(user_id,task_date);
alter table public.tasks enable row level security;
drop policy if exists tasks_private on public.tasks;
create policy tasks_private on public.tasks for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

create table if not exists public.daily_progress (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 progress_date date not null,
 total_tasks integer not null check(total_tasks>=0),
 completed_tasks integer not null check(completed_tasks>=0 and completed_tasks<=total_tasks),
 completion_rate numeric(5,2) check(completion_rate between 0 and 100),
 created_at timestamptz not null default now(),
 unique(user_id,progress_date),
 constraint valid_progress check ((total_tasks=0 and completion_rate is null) or (total_tasks>0 and completion_rate is not null))
);
create index if not exists progress_user_date_idx on public.daily_progress(user_id,progress_date);
alter table public.daily_progress enable row level security;
drop policy if exists progress_read_self on public.daily_progress;
create policy progress_read_self on public.daily_progress for select to authenticated
 using ((select auth.uid())=user_id);

-- Called by database owner or pg_cron, not by an app client.
-- Locks protect the archive against concurrent edits and duplicate attempts.
create or replace function public.archive_past_daily_tasks()
returns void language plpgsql security definer
set search_path = '' as $$
begin
 lock table public.tasks in share row exclusive mode;
 insert into public.daily_progress(user_id,progress_date,total_tasks,completed_tasks,completion_rate)
 select user_id,task_date,count(*)::integer,
        count(*) filter(where status='done')::integer,
        round(100.0*count(*) filter(where status='done')/nullif(count(*),0),2)
 from public.tasks
 where task_date < ((now() at time zone 'Asia/Bangkok')::date)
 group by user_id,task_date
 on conflict(user_id,progress_date) do update set
   total_tasks=excluded.total_tasks,
   completed_tasks=excluded.completed_tasks,
   completion_rate=excluded.completion_rate;
 delete from public.tasks
 where task_date < ((now() at time zone 'Asia/Bangkok')::date)
 and exists(select 1 from public.daily_progress p
   where p.user_id=tasks.user_id and p.progress_date=tasks.task_date);
end;
$$;
revoke all on function public.archive_past_daily_tasks() from public, anon, authenticated;
-- IMPORTANT: Run the scheduler file separately only after confirming account & timezone.
