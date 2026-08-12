-- profiles and daily_logs already have full DELETE coverage via their single
-- "Users can manage own profile" / "Users can manage own logs" FOR ALL
-- policies (confirmed via live RLS policy counts: profiles=2, daily_logs=1,
-- matching new_supabase_full_setup.sql exactly). This migration makes that
-- coverage explicit with a dedicated DELETE policy on each, matching the
-- granular per-operation style already used for subscriptions/saved_recipes.
-- Safe and redundant by design — Postgres OR-combines multiple permissive
-- policies for the same command, so this changes no live behavior.

drop policy if exists "Users can delete own profile" on public.profiles;
create policy "Users can delete own profile"
on public.profiles
for delete
using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can delete own daily logs" on public.daily_logs;
create policy "Users can delete own daily logs"
on public.daily_logs
for delete
using (auth.jwt() ->> 'sub' = clerk_user_id);
