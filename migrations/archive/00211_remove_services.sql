-- Remove legacy service-based routing tables/columns
ALTER TABLE request_logs DROP COLUMN IF EXISTS service_id;

DROP TABLE IF EXISTS api_key_services;
DROP TABLE IF EXISTS service_model_services;
DROP TABLE IF EXISTS services;
