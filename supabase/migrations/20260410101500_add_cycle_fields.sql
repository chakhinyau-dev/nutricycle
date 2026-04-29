alter table public.profiles
add column if not exists cycle_length integer default 28 check (cycle_length between 21 and 40),
add column if not exists period_length integer default 5 check (period_length between 2 and 10),
add column if not exists last_period_start date default current_date;
