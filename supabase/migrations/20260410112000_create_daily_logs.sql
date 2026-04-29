create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  mood text,
  symptoms jsonb not null default '[]'::jsonb,
  notes text,
  cycle_day integer,
  phase_key text check (phase_key in ('menstrual', 'follicular', 'ovulation', 'luteal')),
  logged_at timestamptz not null default timezone('utc', now()),
  log_date date generated always as ((logged_at at time zone 'utc')::date) stored,
  created_at timestamptz not null default timezone('utc', now()),
  unique (clerk_user_id, log_date)
);

alter table public.daily_logs enable row level security;

drop policy if exists "Users can read own daily logs" on public.daily_logs;
create policy "Users can read own daily logs"
on public.daily_logs
for select
using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can insert own daily logs" on public.daily_logs;
create policy "Users can insert own daily logs"
on public.daily_logs
for insert
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can update own daily logs" on public.daily_logs;
create policy "Users can update own daily logs"
on public.daily_logs
for update
using (auth.jwt() ->> 'sub' = clerk_user_id)
with check (auth.jwt() ->> 'sub' = clerk_user_id);
