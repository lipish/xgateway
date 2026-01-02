-- ============================================================
-- Initial Database Schema for LLM-Link Multi-Provider System
-- ============================================================

-- ==================== Core Tables ====================

-- Providers table: Store provider instances (user-configured)
CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL,
    config TEXT NOT NULL,                               -- JSON: {api_key, base_url, model}
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    endpoint TEXT,                                      -- For Volcengine ep-xxx
    secret_id TEXT,                                     -- For Tencent Cloud Secret ID
    secret_key TEXT,                                    -- For Tencent Cloud Secret Key
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_providers_enabled ON providers(enabled);
CREATE INDEX IF NOT EXISTS idx_providers_priority ON providers(priority DESC);
CREATE INDEX IF NOT EXISTS idx_providers_type ON providers(type);

-- Provider Types table: Store provider templates (system-defined)
CREATE TABLE IF NOT EXISTS provider_types (
    id TEXT PRIMARY KEY,                                -- e.g., "openai", "volcengine"
    label TEXT NOT NULL,                                -- Display name
    base_url TEXT NOT NULL,                             -- Default API base URL
    default_model TEXT NOT NULL,                        -- Default model ID
    models TEXT NOT NULL,                               -- JSON array of model objects
    docs_url TEXT DEFAULT '',                           -- Documentation URL
    enabled BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_types_sort ON provider_types(sort_order ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_provider_types_enabled ON provider_types(enabled);

-- System Configuration table
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO config (key, value) VALUES ('setup_completed', 'false');
INSERT OR IGNORE INTO config (key, value) VALUES ('version', '1.0.0');

-- ==================== Chat History ====================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT '新对话',
    provider_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_conversations_provider ON conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at ASC);

-- ==================== Request Logs ====================

-- Request logs table for API monitoring
CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER,
    provider_name TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    request_type TEXT NOT NULL DEFAULT 'chat',
    request_content TEXT,
    response_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_provider_id ON request_logs(provider_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(status);