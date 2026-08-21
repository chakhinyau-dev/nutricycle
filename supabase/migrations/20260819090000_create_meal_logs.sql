-- "Analizar plato" feature (replaces Predictor IA): a user photographs a
-- meal, Gemini identifies the foods and estimates macros, the user can edit
-- the result, then saves it here as a history entry.

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  logged_at timestamptz not null default timezone('utc', now()),
  detected_items jsonb not null default '[]'::jsonb,
  total_calories numeric not null default 0,
  total_protein numeric not null default 0,
  total_carbs numeric not null default 0,
  total_fat numeric not null default 0,
  phase_key text check (phase_key in ('menstrual', 'follicular', 'ovulation', 'luteal')),
  phase_note text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.meal_logs enable row level security;

drop policy if exists "Users can read own meal logs" on public.meal_logs;
create policy "Users can read own meal logs"
on public.meal_logs
for select
using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can insert own meal logs" on public.meal_logs;
create policy "Users can insert own meal logs"
on public.meal_logs
for insert
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can update own meal logs" on public.meal_logs;
create policy "Users can update own meal logs"
on public.meal_logs
for update
using (auth.jwt() ->> 'sub' = clerk_user_id)
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can delete own meal logs" on public.meal_logs;
create policy "Users can delete own meal logs"
on public.meal_logs
for delete
using (auth.jwt() ->> 'sub' = clerk_user_id);
