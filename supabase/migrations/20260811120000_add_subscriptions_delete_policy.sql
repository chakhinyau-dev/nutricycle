-- Allow a signed-in user to delete their own subscriptions row.
-- Needed for the in-app "Delete Account" flow (Apple App Store Guideline 5.1.1(v))
-- so a user can fully remove their own data, independent of the service role.
-- Safe to run multiple times.

drop policy if exists "Users can delete own subscription" on public.subscriptions;
create policy "Users can delete own subscription"
on public.subscriptions
for delete
using (auth.jwt() ->> 'sub' = clerk_user_id);
