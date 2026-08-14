-- Same reserved-claim bug as 20260813090000_fix_admin_policies_use_user_role_claim.sql,
-- but for Storage: the upload policies on both the video-content and
-- recipe-images buckets check auth.jwt() ->> 'role', which is always the
-- literal string "authenticated" for any signed-in user (PostgREST reserves
-- it to pick the Postgres role) — it can never equal 'admin' or 'owner'.
-- The earlier fix only updated the public.recipes/articles/videos/key_foods
-- TABLE policies; these storage.objects policies were missed and are still
-- checking the broken claim.

drop policy if exists "Admins can upload videos" on storage.objects;
create policy "Admins can upload videos"
on storage.objects
for insert
with check (
  bucket_id = 'video-content' and (
    (auth.jwt() ->> 'user_role' = 'owner') or
    (auth.jwt() ->> 'user_role' = 'admin') or
    (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
  )
);

drop policy if exists "Admins can upload recipe images" on storage.objects;
create policy "Admins can upload recipe images"
on storage.objects
for insert
with check (
  bucket_id = 'recipe-images' and (
    (auth.jwt() ->> 'user_role' = 'owner') or
    (auth.jwt() ->> 'user_role' = 'admin') or
    (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
  )
);
