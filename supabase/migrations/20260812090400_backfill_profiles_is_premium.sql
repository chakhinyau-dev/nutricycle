-- One-time reconciliation: profiles.is_premium was observed FALSE for every
-- visible row while subscriptions has rows with status = 'active'. This is
-- evidence of drift caused by the premium-sync bug already flagged in
-- App.js's canAccessPremium / subscriptionService.js's recordSubscription()
-- logic (an app-code fix, out of scope for this migration). This corrects
-- the existing data drift so that fix has consistent data to build on —
-- it does not stop the drift from recurring on its own.

update public.profiles p
set is_premium = true, updated_at = timezone('utc', now())
from public.subscriptions s
where s.clerk_user_id = p.clerk_user_id
  and s.status = 'active'
  and (s.current_period_end is null or s.current_period_end > now())
  and p.is_premium = false;

update public.profiles p
set is_premium = false, updated_at = timezone('utc', now())
where p.is_premium = true
  and not exists (
    select 1 from public.subscriptions s
    where s.clerk_user_id = p.clerk_user_id
      and s.status = 'active'
      and (s.current_period_end is null or s.current_period_end > now())
  );
