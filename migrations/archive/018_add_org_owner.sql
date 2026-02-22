BEGIN;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS owner_id BIGINT REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);

COMMIT;
