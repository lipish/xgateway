-- Add docs_url field to provider_types table
-- This field stores the documentation URL for the provider's model list

ALTER TABLE provider_types ADD COLUMN docs_url TEXT DEFAULT '';

