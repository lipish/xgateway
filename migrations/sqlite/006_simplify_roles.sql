-- Simplify roles to admin and user only

-- Update roles table: remove super_admin and developer, keep admin
DELETE FROM roles WHERE id IN ('super_admin', 'developer');

-- Update admin permissions
UPDATE roles SET permissions = '["provider:*", "user:*", "api_key:*", "instance:grant"]' WHERE id = 'admin';

-- Create user role
INSERT OR REPLACE INTO roles (id, name, permissions) VALUES 
('user', 'User', '["instance:view_granted", "api_key:view_granted"]');

-- Update existing users with developer role to user role
UPDATE users SET role_id = 'user' WHERE role_id = 'developer';

-- Update existing users with super_admin role to admin role
UPDATE users SET role_id = 'admin' WHERE role_id = 'super_admin';

-- Create user_instances junction table (many-to-many relationship)
CREATE TABLE user_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, provider_id)
);

CREATE INDEX idx_user_instances_user ON user_instances(user_id);
CREATE INDEX idx_user_instances_provider ON user_instances(provider_id);