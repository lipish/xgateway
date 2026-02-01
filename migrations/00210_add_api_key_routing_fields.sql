-- Add routing fields to api_keys for instance binding strategy
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS strategy TEXT NOT NULL DEFAULT 'Priority';

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS fallback_chain TEXT;
