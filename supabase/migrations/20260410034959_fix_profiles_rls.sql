-- Allow authenticated users to read their own profile
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.jwt() ->> 'sub' = clerk_user_id);
