-- Add driver_type column to provider_types
ALTER TABLE provider_types ADD COLUMN driver_type TEXT NOT NULL DEFAULT 'openai_compatible';

-- Update existing records with correct driver_types
UPDATE provider_types SET driver_type = 'openai' WHERE id = 'openai';
UPDATE provider_types SET driver_type = 'anthropic' WHERE id = 'anthropic';
UPDATE provider_types SET driver_type = 'aliyun' WHERE id = 'aliyun';
UPDATE provider_types SET driver_type = 'volcengine' WHERE id = 'volcengine';
UPDATE provider_types SET driver_type = 'tencent' WHERE id = 'tencent';
UPDATE provider_types SET driver_type = 'ollama' WHERE id = 'ollama';
UPDATE provider_types SET driver_type = 'openai_compatible' WHERE id IN ('zhipu', 'moonshot', 'minimax', 'longcat', 'deepseek');
