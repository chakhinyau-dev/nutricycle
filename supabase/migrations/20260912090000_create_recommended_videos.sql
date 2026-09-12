-- "Recomendados por ti" — videos the user has personally flagged via the
-- recommend button on each video card. One row per (user, video); the
-- unique constraint means re-recommending the same video is a no-op rather
-- than a duplicate row, and un-recommending is a plain delete.

create table if not exists public.recommended_videos (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  video_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (clerk_user_id, video_id)
);

alter table public.recommended_videos enable row level security;

drop policy if exists "Users can read own recommended videos" on public.recommended_videos;
create policy "Users can read own recommended videos"
on public.recommended_videos
for select
using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can insert own recommended videos" on public.recommended_videos;
create policy "Users can insert own recommended videos"
on public.recommended_videos
for insert
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can delete own recommended videos" on public.recommended_videos;
create policy "Users can delete own recommended videos"
on public.recommended_videos
for delete
using (auth.jwt() ->> 'sub' = clerk_user_id);
