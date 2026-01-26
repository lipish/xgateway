-- Add service_id to request_logs for service-level observability

BEGIN;

ALTER TABLE IF EXISTS request_logs
  ADD COLUMN IF NOT EXISTS service_id TEXT;

CREATE INDEX IF NOT EXISTS idx_request_logs_service_id ON request_logs(service_id);

COMMIT;
