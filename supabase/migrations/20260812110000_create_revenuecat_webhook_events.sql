-- Idempotency log for the new revenuecat-webhook edge function, mirroring
-- the existing stripe_webhook_events table exactly (same shape, same
-- service-role-only RLS pattern). RevenueCat can retry webhook deliveries,
-- so each event.id is recorded once and skipped on redelivery.

create table if not exists public.revenuecat_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

alter table public.revenuecat_webhook_events enable row level security;

drop policy if exists "Service role manages revenuecat webhook events" on public.revenuecat_webhook_events;
create policy "Service role manages revenuecat webhook events"
on public.revenuecat_webhook_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
