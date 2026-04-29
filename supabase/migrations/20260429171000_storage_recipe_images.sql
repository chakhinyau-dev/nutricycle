-- Ensure the recipe image storage bucket exists for admin uploads and public playback
insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

-- Allow public reads for recipe images
drop policy if exists "Public Access recipe-images" on storage.objects;
create policy "Public Access recipe-images"
on storage.objects
for select
using (bucket_id = 'recipe-images');

-- Restrict recipe image uploads to trusted admin users
drop policy if exists "Admins can upload recipe images" on storage.objects;
create policy "Admins can upload recipe images"
on storage.objects
for insert
with check (
  bucket_id = 'recipe-images' and (
    (auth.jwt() ->> 'role' = 'owner') or
    (auth.jwt() ->> 'role' = 'admin') or
    (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
  )
);
