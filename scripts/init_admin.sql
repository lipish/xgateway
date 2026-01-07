-- Initialize default admin user
-- Run this with: sqlite3 data/llm_link.db < scripts/init_admin.sql

INSERT OR IGNORE INTO users (username, password_hash, role_id, status) 
VALUES ('admin', 'admin123', 'admin', 'active');
