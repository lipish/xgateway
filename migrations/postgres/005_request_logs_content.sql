-- Add request and response content columns to request_logs
ALTER TABLE request_logs ADD COLUMN IF NOT EXISTS request_content TEXT;
ALTER TABLE request_logs ADD COLUMN IF NOT EXISTS response_content TEXT;
