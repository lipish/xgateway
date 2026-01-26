-- Add per-service rate limit and concurrency controls

ALTER TABLE services
    ADD COLUMN IF NOT EXISTS qps_limit DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    ADD COLUMN IF NOT EXISTS concurrency_limit INTEGER NOT NULL DEFAULT 50,
    ADD COLUMN IF NOT EXISTS max_queue_size INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS max_queue_wait_ms INTEGER NOT NULL DEFAULT 30000;

CREATE INDEX IF NOT EXISTS idx_services_enabled_limits ON services(enabled, qps_limit, concurrency_limit);
