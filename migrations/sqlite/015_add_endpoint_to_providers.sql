-- Add endpoint column to providers table
-- Some providers (like Volcengine) use endpoint IDs instead of model names
ALTER TABLE providers ADD COLUMN endpoint TEXT;
