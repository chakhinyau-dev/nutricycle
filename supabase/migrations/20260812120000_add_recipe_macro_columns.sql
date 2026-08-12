-- Adds real per-recipe macro columns. Recipes previously had no way to
-- store actual protein/carbs/fat/fiber — every screen that showed macro
-- numbers was independently *guessing* them from calories alone, and each
-- screen guessed with a different formula, so the same recipe could show
-- different macros depending which screen you viewed it from.
--
-- These columns are nullable and optional in the Admin recipe form — when
-- left blank, the app falls back to a single shared estimate formula
-- (src/utils/nutrition.js) instead of each screen inventing its own.

alter table public.recipes
  add column if not exists protein numeric,
  add column if not exists carbs numeric,
  add column if not exists fat numeric,
  add column if not exists fiber numeric;
