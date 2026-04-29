-- Allow public read access to recipes
drop policy if exists "Authenticated users can read recipes" on public.recipes;

create policy "Anyone can read recipes"
on public.recipes
for select
using (true);
