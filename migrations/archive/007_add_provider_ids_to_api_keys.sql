-- Add provider_ids column to api_keys table
ALTER TABLE api_keys ADD COLUMN provider_ids TEXT;
