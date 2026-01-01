-- Request logs table for tracking API requests
CREATE TABLE IF NOT EXISTS request_logs (
    id SERIAL PRIMARY KEY,
    provider_id INTEGER,
    provider_name TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    request_type TEXT NOT NULL DEFAULT 'chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_provider_id ON request_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status);
