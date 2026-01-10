-- Remove default_model column from provider_types
ALTER TABLE provider_types DROP COLUMN IF EXISTS default_model;
