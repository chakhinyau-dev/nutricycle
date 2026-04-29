create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  recipe_id bigint not null references public.recipes(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (clerk_user_id, recipe_id)
);

alter table public.saved_recipes enable row level security;

drop policy if exists "Users can read own saved recipes" on public.saved_recipes;
create policy "Users can read own saved recipes"
on public.saved_recipes
for select
using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can insert own saved recipes" on public.saved_recipes;
create policy "Users can insert own saved recipes"
on public.saved_recipes
for insert
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can delete own saved recipes" on public.saved_recipes;
create policy "Users can delete own saved recipes"
on public.saved_recipes
for delete
using (auth.jwt() ->> 'sub' = clerk_user_id);
