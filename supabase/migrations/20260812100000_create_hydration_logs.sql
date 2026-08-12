-- HydrationScreen.js is pure useState today — resets to a hardcoded value
-- on every mount, no persistence at all. This table mirrors daily_logs'
-- one-row-per-user-per-day pattern so hydration survives reload and syncs
-- across devices.
--
-- entries jsonb holds the quick-add history:
--   [{ amount_ml, source_label, logged_at }]
-- same idea as daily_logs.symptoms.
--
-- Follow-up app-code work (not part of this migration): new
-- src/services/hydrationService.js with loadTodayHydration/saveHydration,
-- following the exact upsert pattern already in dailyLogService.js
-- (onConflict: 'clerk_user_id,log_date'); wire HydrationScreen.js to load/
-- persist through it instead of local state; add hydration_logs to
-- accountService.js's deletion list.

create table if not exists public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  log_date date not null default (timezone('utc', now()))::date,
  amount_ml integer not null default 0 check (amount_ml >= 0),
  goal_ml integer not null default 2500 check (goal_ml > 0),
  entries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (clerk_user_id, log_date)
);

alter table public.hydration_logs enable row level security;

drop policy if exists "Users can read own hydration logs" on public.hydration_logs;
create policy "Users can read own hydration logs" on public.hydration_logs
for select using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can insert own hydration logs" on public.hydration_logs;
create policy "Users can insert own hydration logs" on public.hydration_logs
for insert with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can update own hydration logs" on public.hydration_logs;
create policy "Users can update own hydration logs" on public.hydration_logs
for update using (auth.jwt() ->> 'sub' = clerk_user_id) with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can delete own hydration logs" on public.hydration_logs;
create policy "Users can delete own hydration logs" on public.hydration_logs
for delete using (auth.jwt() ->> 'sub' = clerk_user_id);
