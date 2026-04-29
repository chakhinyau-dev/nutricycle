-- Normalize Clerk-linked IDs to text so Clerk user ids like "user_..." work.
-- Safe to run even if the columns are already text.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'clerk_user_id'
      and udt_name = 'uuid'
  ) then
    alter table public.profiles
      alter column clerk_user_id type text using clerk_user_id::text;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'daily_logs'
      and column_name = 'clerk_user_id'
      and udt_name = 'uuid'
  ) then
    alter table public.daily_logs
      alter column clerk_user_id type text using clerk_user_id::text;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'saved_recipes'
      and column_name = 'clerk_user_id'
      and udt_name = 'uuid'
  ) then
    alter table public.saved_recipes
      alter column clerk_user_id type text using clerk_user_id::text;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'clerk_user_id'
      and udt_name = 'uuid'
  ) then
    alter table public.subscriptions
      alter column clerk_user_id type text using clerk_user_id::text;
  end if;
end $$;

