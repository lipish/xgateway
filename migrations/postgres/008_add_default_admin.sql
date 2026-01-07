-- Add default administrator user
-- Username: admin
-- Password: admin123 (MUST be changed after first login)

INSERT INTO users (username, password_hash, role_id, status) 
VALUES ('admin', 'admin123', 'admin', 'active');
