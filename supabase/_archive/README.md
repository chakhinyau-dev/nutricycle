# Archived — do not run against the live project

These files were three separate, disagreeing "schema definition" sources that used to coexist
in the repo root alongside the real migration history, which made it impossible to tell which
one actually matched the live database.

- `new_supabase_full_setup.sql` / `supabase_setup.sql` / `fix_supabase_issues.sql` — ad-hoc
  "paste into the Supabase SQL Editor" setup scripts, explicitly targeting the live project ref
  (`oeylybzkyujzcbkmvenj`).
- `schema.sql` — a hand-consolidated snapshot that disagreed with the scripts above in places
  (e.g. it omitted the overly-broad "service role" subscriptions policy that turned out to be
  what was actually live).

As of 2026-08, `supabase/migrations/` (applied via the Supabase SQL Editor, matching the
Supabase CLI timestamped-migration convention) is the **single source of truth** for this
project's schema. Every RLS policy count observed live in the Supabase Table Editor was
cross-checked against these archived files and matched `new_supabase_full_setup.sql` exactly —
confirming it (not this folder's other files) was what had actually been applied, historically.

Kept here for history only.
