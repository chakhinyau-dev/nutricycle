-- Add ingredients and instructions directly to videos table
-- so recipe content can be stored alongside video metadata

ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS ingredients text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS instructions text[] DEFAULT '{}';
