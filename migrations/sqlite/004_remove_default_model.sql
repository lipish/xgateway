-- Remove default_model column from provider_types
-- SQLite doesn't support DROP COLUMN directly in older versions, 
-- but since we are using sqlx with a modern SQLite, we can try it 
-- or use the "create new table and copy" approach.
-- For simplicity and compatibility, we'll use the "create new table" approach if needed,
-- but sqlx usually handles migrations well. 
-- Actually, SQLite 3.35.0+ (released 2021) supports DROP COLUMN.

ALTER TABLE provider_types DROP COLUMN default_model;
