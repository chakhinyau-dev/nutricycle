-- Ensure the video storage bucket exists for uploads and playback
insert into storage.buckets (id, name, public)
values ('video-content', 'video-content', true)
on conflict (id) do nothing;

-- Allow public reads for uploaded videos
drop policy if exists "Public Access video-content" on storage.objects;
create policy "Public Access video-content"
on storage.objects
for select
using (bucket_id = 'video-content');

-- Restrict uploads to trusted admin users
drop policy if exists "Admins can upload videos" on storage.objects;
create policy "Admins can upload videos"
on storage.objects
for insert
with check (
  bucket_id = 'video-content' and (
    (auth.jwt() ->> 'role' = 'owner') or
    (auth.jwt() ->> 'role' = 'admin') or
    (auth.jwt() ->> 'email' = 'salat.mahenoor7.8.6@gmail.com')
  )
);
