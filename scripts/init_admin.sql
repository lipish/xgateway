-- Initialize default admin user
-- Run this with: psql "$DATABASE_URL" -f scripts/init_admin.sql

INSERT INTO users (username, password_hash, role_id, status)
VALUES ('admin', 'admin123', 'admin', 'active')
ON CONFLICT (username) DO NOTHING;
