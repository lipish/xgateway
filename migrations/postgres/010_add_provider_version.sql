-- Add optimistic locking version field for providers
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_providers_version ON providers(version);
