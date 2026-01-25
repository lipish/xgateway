-- Ensure user_instances.granted_at uses timestamptz for UTC compatibility
ALTER TABLE user_instances
  ALTER COLUMN granted_at TYPE TIMESTAMPTZ
  USING granted_at AT TIME ZONE 'UTC';
