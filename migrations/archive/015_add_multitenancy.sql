-- Add minimal multi-tenancy: organizations/projects, resource ownership, and request log attribution

BEGIN;

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
    id BIGSERIAL PRIMARY KEY,
    org_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);

-- Seed a default org/project for backward compatibility
INSERT INTO organizations (id, name)
VALUES (1, 'default')
ON CONFLICT (id) DO NOTHING;

INSERT INTO projects (id, org_id, name)
VALUES (1, 1, 'default')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('organizations', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM organizations), 1));
SELECT setval(pg_get_serial_sequence('projects', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM projects), 1));

-- Add ownership to services and api_keys
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS project_id BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_services_project_id ON services(project_id);

ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS project_id BIGINT NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);

-- Add attribution to request_logs
ALTER TABLE request_logs
  ADD COLUMN IF NOT EXISTS api_key_id BIGINT,
  ADD COLUMN IF NOT EXISTS project_id BIGINT,
  ADD COLUMN IF NOT EXISTS org_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_id ON request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_project_id ON request_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_org_id ON request_logs(org_id);

COMMIT;
