-- Persists AI Chat conversation history (previously only ever lived in
-- React state — lost the moment the screen unmounted). Used both to let a
-- conversation resume across app sessions and to feed recent turns back
-- into the model as personalization context. Retained for 30 days only —
-- see the pg_cron job below.

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ai_chat_messages_user_created_idx
  on public.ai_chat_messages (clerk_user_id, created_at desc);

alter table public.ai_chat_messages enable row level security;

drop policy if exists "Users can read own chat messages" on public.ai_chat_messages;
create policy "Users can read own chat messages"
on public.ai_chat_messages
for select
using (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can insert own chat messages" on public.ai_chat_messages;
create policy "Users can insert own chat messages"
on public.ai_chat_messages
for insert
with check (auth.jwt() ->> 'sub' = clerk_user_id);

drop policy if exists "Users can delete own chat messages" on public.ai_chat_messages;
create policy "Users can delete own chat messages"
on public.ai_chat_messages
for delete
using (auth.jwt() ->> 'sub' = clerk_user_id);

-- Auto-expiry: Postgres's own scheduler does the cleanup, no app code or
-- external service needed. Runs once a day; safe to re-run this migration
-- since cron.schedule replaces a job of the same name.
create extension if not exists pg_cron;

select cron.schedule(
  'delete-old-ai-chat-messages',
  '0 3 * * *',
  $$ delete from public.ai_chat_messages where created_at < now() - interval '30 days'; $$
);
