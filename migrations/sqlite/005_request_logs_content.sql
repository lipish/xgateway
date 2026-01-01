-- Add request and response content columns to request_logs
ALTER TABLE request_logs ADD COLUMN request_content TEXT;
ALTER TABLE request_logs ADD COLUMN response_content TEXT;

