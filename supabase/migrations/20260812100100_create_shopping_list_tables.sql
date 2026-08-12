-- ShoppingListScreen.js persists only to AsyncStorage per-device today
-- (@nutricycle_checked_v2_{userId}_{phaseKey}, @nutricycle_custom_items_{userId}),
-- never synced to Supabase, so it doesn't survive reinstall or sync across
-- devices. These two tables mirror the existing AsyncStorage key shapes
-- exactly, so this is a sync layer, not a redesign.
--
-- Follow-up app-code work (not part of this migration): extend
-- appStorage.js (or a new shoppingListService.js) with Supabase-backed
-- load/save matching ShoppingListScreen.js's existing toggle/add/remove/
-- clear functions — keep AsyncStorage as an offline cache (same dual-write
-- pattern dailyLogService.js already uses), not a full replacement. Add
-- both tables to accountService.js's deletion list.

create table if not exists public.shopping_list_state (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  phase_key text not null check (phase_key in ('menstrual', 'follicular', 'ovulation', 'luteal')),
  checked_items jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (clerk_user_id, phase_key)
);

create table if not exists public.shopping_list_custom_items (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  name text not null,
  is_checked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.shopping_list_state enable row level security;
alter table public.shopping_list_custom_items enable row level security;

drop policy if exists "Users can manage own shopping list state" on public.shopping_list_state;
create policy "Users can manage own shopping list state" on public.shopping_list_state
for all using (auth.jwt() ->> 'sub' = clerk_user_id) with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can manage own shopping list custom items" on public.shopping_list_custom_items;
create policy "Users can manage own shopping list custom items" on public.shopping_list_custom_items
for all using (auth.jwt() ->> 'sub' = clerk_user_id) with check (auth.jwt() ->> 'sub' = clerk_user_id);
