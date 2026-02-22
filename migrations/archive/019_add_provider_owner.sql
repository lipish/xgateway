BEGIN;

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_providers_owner_id ON providers(owner_id);

COMMIT;
