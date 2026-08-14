-- Adds a free-text "coaching tips" field to videos and recipes, so the
-- coach can attach a short personal note/tip alongside the ingredients and
-- instructions, shown to users on the video/recipe detail screens.

alter table public.videos
  add column if not exists coaching_tips text;

alter table public.recipes
  add column if not exists coaching_tips text;
