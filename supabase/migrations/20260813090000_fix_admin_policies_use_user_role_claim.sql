-- Fixes a bug introduced in 20260812090200_fix_content_manage_policies.sql and
-- 20260812090300_document_key_foods_table.sql: those policies checked
-- auth.jwt() ->> 'role', but 'role' is a RESERVED claim in Supabase's JWT
-- convention — PostgREST reads it to pick which Postgres role runs the
-- query (authenticated / anon / service_role), so it is always the literal
-- string "authenticated" for any signed-in user and can never equal
-- 'admin' or 'owner'. That made every admin write fail regardless of the
-- user's actual Clerk role, surfaced in the app as "Error al guardar".
--
-- Fix: Clerk's "supabase" JWT template now emits a second, non-reserved
-- claim, "user_role", mapped from {{user.public_metadata.role}}. These
-- policies are updated to check that claim instead.

drop policy if exists "Admins can manage recipes" on public.recipes;
create policy "Admins can manage recipes"
on public.recipes
for all
using (
  (auth.jwt() ->> 'user_role' = 'owner') or
  (auth.jwt() ->> 'user_role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
)
with check (
  (auth.jwt() ->> 'user_role' = 'owner') or
  (auth.jwt() ->> 'user_role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
);

drop policy if exists "Admins can manage articles" on public.articles;
create policy "Admins can manage articles"
on public.articles
for all
using (
  (auth.jwt() ->> 'user_role' = 'owner') or
  (auth.jwt() ->> 'user_role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
)
with check (
  (auth.jwt() ->> 'user_role' = 'owner') or
  (auth.jwt() ->> 'user_role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
);

drop policy if exists "Admins can manage videos" on public.videos;
create policy "Admins can manage videos"
on public.videos
for all
using (
  (auth.jwt() ->> 'user_role' = 'owner') or
  (auth.jwt() ->> 'user_role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
)
with check (
  (auth.jwt() ->> 'user_role' = 'owner') or
  (auth.jwt() ->> 'user_role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
);

drop policy if exists "Admins can manage key foods" on public.key_foods;
create policy "Admins can manage key foods"
on public.key_foods
for all
using (
  (auth.jwt() ->> 'user_role' = 'owner') or
  (auth.jwt() ->> 'user_role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
)
with check (
  (auth.jwt() ->> 'user_role' = 'owner') or
  (auth.jwt() ->> 'user_role' = 'admin') or
  (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
);
