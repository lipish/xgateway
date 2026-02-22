-- Add protocol field to api_keys
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS protocol TEXT NOT NULL DEFAULT 'openai';
