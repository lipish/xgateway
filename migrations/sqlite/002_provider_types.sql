-- Create provider_types table to store supported provider types and their models
-- This replaces the hardcoded provider types in the backend code

CREATE TABLE IF NOT EXISTS provider_types (
    id TEXT PRIMARY KEY,                    -- e.g., "openai", "anthropic", "zhipu"
    label TEXT NOT NULL,                    -- Display name, e.g., "OpenAI", "智谱 AI"
    base_url TEXT NOT NULL,                 -- Default API base URL
    default_model TEXT NOT NULL,            -- Default model ID
    models TEXT NOT NULL,                   -- JSON array of model objects
    enabled BOOLEAN DEFAULT true,           -- Whether this provider type is available
    sort_order INTEGER DEFAULT 0,           -- Display order in UI
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_provider_types_sort ON provider_types(sort_order ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_provider_types_enabled ON provider_types(enabled);

