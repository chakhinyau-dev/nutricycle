-- The Admin panel's food category picker was expanded earlier this session
-- to include "grains", "extras", and "herbs" (Granos / Extras / Hierbas &
-- Adaptógenos), but key_foods.category_key's CHECK constraint was never
-- updated to match — it still only allowed the original four values
-- (proteins, fats, carbs, veg_fruits). Saving a food tagged with any of the
-- three new categories violated the constraint and Postgres rejected the
-- write, surfaced in the app as the generic "couldn't save, check your
-- connection or admin role" message (the real cause was hidden by
-- saveKeyFood() swallowing the actual error — fixed alongside this in
-- keyFoodsService.js).

alter table public.key_foods
  drop constraint if exists key_foods_category_key_check;

alter table public.key_foods
  add constraint key_foods_category_key_check
  check (category_key in ('proteins', 'fats', 'carbs', 'veg_fruits', 'grains', 'extras', 'herbs'));
