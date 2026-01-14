-- Add org membership (org_users) for admin console tenancy enforcement

BEGIN;

CREATE TABLE IF NOT EXISTS org_users (
    org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON org_users(user_id);

-- Backfill: put all existing users into default org for backward compatibility
INSERT INTO org_users (org_id, user_id)
SELECT 1, u.id
FROM users u
ON CONFLICT (org_id, user_id) DO NOTHING;

COMMIT;
