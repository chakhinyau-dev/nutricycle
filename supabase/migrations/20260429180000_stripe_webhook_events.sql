create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default timezone('utc', now())
);

alter table public.stripe_webhook_events enable row level security;

drop policy if exists "Service role manages webhook events" on public.stripe_webhook_events;
create policy "Service role manages webhook events"
on public.stripe_webhook_events
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
