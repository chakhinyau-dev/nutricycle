-- The Daily Log screen has always had an "Energy" step (baja/media/alta —
-- Low/Medium/High), but daily_logs never had a column for it and
-- dailyLogService.js's upsert payload never sent it, so every energy
-- selection was silently discarded before it ever reached the database.
-- IF NOT EXISTS makes this a no-op if the column is somehow already there.

alter table public.daily_logs
  add column if not exists energy_level text;
