-- Upgrade INT4/SERIAL identifiers to BIGINT/BIGSERIAL (Postgres)
--
-- This migration aligns database id types with Rust i64 usage.
-- It intentionally drops and recreates foreign keys to avoid type mismatch errors.

BEGIN;

-- 1) Drop foreign keys (names are the default Postgres-generated ones)
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS conversations_provider_id_fkey;
ALTER TABLE IF EXISTS request_logs DROP CONSTRAINT IF EXISTS request_logs_provider_id_fkey;
ALTER TABLE IF EXISTS api_keys DROP CONSTRAINT IF EXISTS api_keys_owner_id_fkey;
ALTER TABLE IF EXISTS api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_id_fkey;
ALTER TABLE IF EXISTS user_instances DROP CONSTRAINT IF EXISTS user_instances_user_id_fkey;
ALTER TABLE IF EXISTS user_instances DROP CONSTRAINT IF EXISTS user_instances_provider_id_fkey;
ALTER TABLE IF EXISTS user_instances DROP CONSTRAINT IF EXISTS user_instances_granted_by_fkey;

-- 2) Upgrade primary key columns
ALTER TABLE IF EXISTS providers ALTER COLUMN id TYPE BIGINT;
ALTER TABLE IF EXISTS conversations ALTER COLUMN id TYPE BIGINT;
ALTER TABLE IF EXISTS messages ALTER COLUMN id TYPE BIGINT;
ALTER TABLE IF EXISTS request_logs ALTER COLUMN id TYPE BIGINT;
ALTER TABLE IF EXISTS users ALTER COLUMN id TYPE BIGINT;
ALTER TABLE IF EXISTS api_keys ALTER COLUMN id TYPE BIGINT;
ALTER TABLE IF EXISTS user_instances ALTER COLUMN id TYPE BIGINT;

-- 3) Upgrade foreign key/reference columns
ALTER TABLE IF EXISTS conversations ALTER COLUMN provider_id TYPE BIGINT;
ALTER TABLE IF EXISTS messages ALTER COLUMN conversation_id TYPE BIGINT;
ALTER TABLE IF EXISTS request_logs ALTER COLUMN provider_id TYPE BIGINT;
ALTER TABLE IF EXISTS api_keys ALTER COLUMN owner_id TYPE BIGINT;
ALTER TABLE IF EXISTS api_keys ALTER COLUMN provider_id TYPE BIGINT;
ALTER TABLE IF EXISTS user_instances ALTER COLUMN user_id TYPE BIGINT;
ALTER TABLE IF EXISTS user_instances ALTER COLUMN provider_id TYPE BIGINT;
ALTER TABLE IF EXISTS user_instances ALTER COLUMN granted_by TYPE BIGINT;

-- 4) Upgrade sequences backing SERIAL columns
-- Note: sequences may not exist if tables were created differently; guard with IF EXISTS.
ALTER SEQUENCE IF EXISTS providers_id_seq AS BIGINT;
ALTER SEQUENCE IF EXISTS conversations_id_seq AS BIGINT;
ALTER SEQUENCE IF EXISTS messages_id_seq AS BIGINT;
ALTER SEQUENCE IF EXISTS request_logs_id_seq AS BIGINT;
ALTER SEQUENCE IF EXISTS users_id_seq AS BIGINT;
ALTER SEQUENCE IF EXISTS api_keys_id_seq AS BIGINT;
ALTER SEQUENCE IF EXISTS user_instances_id_seq AS BIGINT;

-- Ensure defaults still point to the sequences
ALTER TABLE IF EXISTS providers ALTER COLUMN id SET DEFAULT nextval('providers_id_seq');
ALTER TABLE IF EXISTS conversations ALTER COLUMN id SET DEFAULT nextval('conversations_id_seq');
ALTER TABLE IF EXISTS messages ALTER COLUMN id SET DEFAULT nextval('messages_id_seq');
ALTER TABLE IF EXISTS request_logs ALTER COLUMN id SET DEFAULT nextval('request_logs_id_seq');
ALTER TABLE IF EXISTS users ALTER COLUMN id SET DEFAULT nextval('users_id_seq');
ALTER TABLE IF EXISTS api_keys ALTER COLUMN id SET DEFAULT nextval('api_keys_id_seq');
ALTER TABLE IF EXISTS user_instances ALTER COLUMN id SET DEFAULT nextval('user_instances_id_seq');

-- 5) Recreate foreign keys
ALTER TABLE IF EXISTS conversations
  ADD CONSTRAINT conversations_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS messages
  ADD CONSTRAINT messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS request_logs
  ADD CONSTRAINT request_logs_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS api_keys
  ADD CONSTRAINT api_keys_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES users(id);

ALTER TABLE IF EXISTS api_keys
  ADD CONSTRAINT api_keys_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id);

ALTER TABLE IF EXISTS user_instances
  ADD CONSTRAINT user_instances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS user_instances
  ADD CONSTRAINT user_instances_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS user_instances
  ADD CONSTRAINT user_instances_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES users(id);

COMMIT;
