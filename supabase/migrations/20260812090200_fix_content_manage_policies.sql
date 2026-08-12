-- Same defect class as the subscriptions fix, but for the content library:
-- "Authenticated users can manage recipes/articles/videos" were all
-- FOR ALL USING (true) with no role restriction — confirmed live via
-- matching RLS policy counts. Any signed-in user, not just admins, could
-- insert/update/delete recipes, articles, and videos.
--
-- Replaces each with the admin-gated pattern already proven correct for
-- storage uploads (supabase/migrations/20260429170000_storage_video_content.sql),
-- matching App.js's own isAdmin check (publicMetadata.role === 'owner' | 'admin').
-- Read policies ("Anyone can read recipes/articles/videos") are untouched.

drop policy if exists "Authenticated users can manage recipes" on public.recipes;
drop policy if exists "Admins can manage recipes" on public.recipes;
create policy "Admins can manage recipes"
on public.recipes
for all
using (
  (auth.jwt() ->> 'role' = 'owner') or
  (auth.jwt() ->> 'role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
)
with check (
  (auth.jwt() ->> 'role' = 'owner') or
  (auth.jwt() ->> 'role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
);

drop policy if exists "Authenticated users can manage articles" on public.articles;
drop policy if exists "Admins can manage articles" on public.articles;
create policy "Admins can manage articles"
on public.articles
for all
using (
  (auth.jwt() ->> 'role' = 'owner') or
  (auth.jwt() ->> 'role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
)
with check (
  (auth.jwt() ->> 'role' = 'owner') or
  (auth.jwt() ->> 'role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
);

drop policy if exists "Authenticated users can manage videos" on public.videos;
drop policy if exists "Admins can manage videos" on public.videos;
create policy "Admins can manage videos"
on public.videos
for all
using (
  (auth.jwt() ->> 'role' = 'owner') or
  (auth.jwt() ->> 'role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
)
with check (
  (auth.jwt() ->> 'role' = 'owner') or
  (auth.jwt() ->> 'role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
);
