-- Closes the cross-user exploit on public.subscriptions: the previous
-- "Service role can manage subscriptions" policy was FOR ALL USING (true)
-- with no `TO service_role` clause, so in Postgres it applied to every role
-- (including regular signed-in app users), not just the service role.
-- Any authenticated user could insert/update ANY user's subscription row,
-- including granting themselves fake `status: 'active'` for free.
--
-- This scopes writes to the row owner only, matching every other user-owned
-- table in this project (profiles, daily_logs, saved_recipes).
--
-- Scope note: this closes the CROSS-USER hole (nobody can touch someone
-- else's row) but does not close SELF-fraud (a user forging their own row
-- to 'active' without paying) — RLS restricts which rows a policy applies
-- to, not which values get written into an owned row. Fully closing that
-- requires moving subscription writes server-side via a RevenueCat webhook
-- (service_role), mirroring supabase/functions/stripe-webhook/index.ts.
-- Tracked as a follow-up, not part of this migration.

drop policy if exists "Service role can manage subscriptions" on public.subscriptions;
drop policy if exists "Users can view own subscription" on public.subscriptions;

drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription"
on public.subscriptions
for select
using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can insert own subscription" on public.subscriptions;
create policy "Users can insert own subscription"
on public.subscriptions
for insert
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can update own subscription" on public.subscriptions;
create policy "Users can update own subscription"
on public.subscriptions
for update
using (auth.jwt() ->> 'sub' = clerk_user_id)
with check (auth.jwt() ->> 'sub' = clerk_user_id);

-- The existing "Users can delete own subscription" policy
-- (20260811120000_add_subscriptions_delete_policy.sql) is untouched by this migration.
