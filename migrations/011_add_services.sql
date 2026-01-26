-- Add Service layer: service_id is the only externally specified routing target.

CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    strategy TEXT NOT NULL DEFAULT 'Priority',
    fallback_chain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_services_enabled ON services(enabled);

-- Service -> Model Service (providers) mapping
CREATE TABLE IF NOT EXISTS service_model_services (
    service_id TEXT NOT NULL,
    provider_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (service_id, provider_id),
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_service_model_services_provider_id ON service_model_services(provider_id);

-- API Key -> Service authorization mapping
CREATE TABLE IF NOT EXISTS api_key_services (
    api_key_id BIGINT NOT NULL,
    service_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (api_key_id, service_id),
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_api_key_services_service_id ON api_key_services(service_id);

-- Seed: create a default service per existing provider (id = provider.name)
INSERT INTO services (id, name)
SELECT p.name, p.name
FROM providers p
ON CONFLICT (id) DO NOTHING;

-- Seed: bind each provider to its default service
INSERT INTO service_model_services (service_id, provider_id)
SELECT p.name, p.id
FROM providers p
ON CONFLICT (service_id, provider_id) DO NOTHING;

-- Seed: migrate legacy api_keys.provider_id to api_key_services
INSERT INTO api_key_services (api_key_id, service_id)
SELECT k.id, p.name
FROM api_keys k
JOIN providers p ON p.id = k.provider_id
WHERE k.provider_id IS NOT NULL
ON CONFLICT (api_key_id, service_id) DO NOTHING;

-- Seed: migrate legacy api_keys.provider_ids (JSON array) to api_key_services
INSERT INTO api_key_services (api_key_id, service_id)
SELECT k.id, p.name
FROM api_keys k
JOIN LATERAL jsonb_array_elements_text(COALESCE(k.provider_ids::jsonb, '[]'::jsonb)) AS pid(provider_id_text) ON true
JOIN providers p ON p.id = pid.provider_id_text::bigint
WHERE k.provider_ids IS NOT NULL AND k.provider_ids <> ''
ON CONFLICT (api_key_id, service_id) DO NOTHING;
