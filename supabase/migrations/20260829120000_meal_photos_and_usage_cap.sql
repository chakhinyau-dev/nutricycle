-- Adds photo storage to meal_logs (kept for 30 days, then just the photo is
-- removed — the food/macro data stays) and a daily usage-cap counter for
-- the Meal Analyzer, since each analysis is a real Gemini API cost
-- regardless of whether the result ever gets saved.

alter table public.meal_logs
  add column if not exists photo_path text;

-- Private bucket — unlike recipe-images/video-content, a user's own meal
-- photos are personal data and should never be publicly readable by anyone
-- who guesses or intercepts the URL.
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', false)
on conflict (id) do nothing;

-- Objects are stored at "{clerk_user_id}/{filename}" — these policies check
-- that the first path segment matches the caller's own sub claim.
drop policy if exists "Users can upload own meal photos" on storage.objects;
create policy "Users can upload own meal photos"
on storage.objects
for insert
with check (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can read own meal photos" on storage.objects;
create policy "Users can read own meal photos"
on storage.objects
for select
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
);

drop policy if exists "Users can delete own meal photos" on storage.objects;
create policy "Users can delete own meal photos"
on storage.objects
for delete
using (
  bucket_id = 'meal-photos'
  and (storage.foldername(name))[1] = auth.jwt() ->> 'sub'
);

-- ===== Usage cap =====
-- One row per user per day. Incremented atomically before each analysis
-- call (see mealAnalysisService.js) so the cap can't be bypassed by two
-- requests racing each other.
create table if not exists public.meal_analysis_usage (
  clerk_user_id text not null,
  usage_date date not null default (timezone('utc', now()))::date,
  count integer not null default 0,
  primary key (clerk_user_id, usage_date)
);

alter table public.meal_analysis_usage enable row level security;

drop policy if exists "Users can manage own analysis usage" on public.meal_analysis_usage;
create policy "Users can manage own analysis usage"
on public.meal_analysis_usage
for all
using (auth.jwt() ->> 'sub' = clerk_user_id)
with check (auth.jwt() ->> 'sub' = clerk_user_id);
