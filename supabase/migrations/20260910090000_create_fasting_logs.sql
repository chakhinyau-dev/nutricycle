-- Fasting Module: start/stop timer + history, synced to cycle phase.
-- One row per fast; end_at/actual_hours stay null while a fast is active,
-- so "the currently running fast" is just the row with end_at is null.

create table if not exists public.fasting_logs (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  start_at timestamptz not null default timezone('utc', now()),
  end_at timestamptz,
  goal_hours numeric not null default 16,
  actual_hours numeric,
  phase_key text check (phase_key in ('menstrual', 'follicular', 'ovulation', 'luteal')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.fasting_logs enable row level security;

drop policy if exists "Users can read own fasting logs" on public.fasting_logs;
create policy "Users can read own fasting logs"
on public.fasting_logs
for select
using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can insert own fasting logs" on public.fasting_logs;
create policy "Users can insert own fasting logs"
on public.fasting_logs
for insert
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can update own fasting logs" on public.fasting_logs;
create policy "Users can update own fasting logs"
on public.fasting_logs
for update
using (auth.jwt() ->> 'sub' = clerk_user_id)
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can delete own fasting logs" on public.fasting_logs;
create policy "Users can delete own fasting logs"
on public.fasting_logs
for delete
using (auth.jwt() ->> 'sub' = clerk_user_id);
