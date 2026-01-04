-- Enterprise Schema Migration (Postgres)

-- roles table
CREATE TABLE roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    permissions TEXT NOT NULL, -- JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(50) REFERENCES roles(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- api_keys table
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(id),
    key_hash VARCHAR(128) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    scope VARCHAR(20) DEFAULT 'global', -- 'global' or 'instance'
    provider_id INTEGER REFERENCES providers(id),
    qps_limit DOUBLE PRECISION DEFAULT 10.0,
    concurrency_limit INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_owner ON api_keys(owner_id);

-- Insert initial roles
INSERT INTO roles (id, name, permissions) VALUES 
('super_admin', 'Super Administrator', '["*"]'),
('admin', 'Administrator', '["provider:*", "user:view", "api_key:*", "audit:view"]'),
('developer', 'Developer', '["api_key:manage", "provider:view"]');
