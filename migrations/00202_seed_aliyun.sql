-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

-- Seed Aliyun provider type with latest models from Bailian
-- https://bailian.console.aliyun.com

INSERT INTO provider_types (id, label, base_url, models, enabled, sort_order, docs_url)
VALUES (
    'aliyun',
    'Aliyun Bailian',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
    '[
        {
            "id": "qwen3-max",
            "name": "Qwen3 Max",
            "description": "Latest flagship, best for agentic coding and tool calling",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0025,
            "output_price": 0.01
        },
        {
            "id": "qwen3.5-plus",
            "name": "Qwen3.5 Plus",
            "description": "Balanced performance, speed and cost, text/image/video input",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.0008,
            "output_price": 0.002
        },
        {
            "id": "qwen-max",
            "name": "Qwen Max",
            "description": "Previous flagship for complex multi-step tasks",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0032,
            "output_price": 0.0128
        },
        {
            "id": "qwen-plus",
            "name": "Qwen Plus", 
            "description": "Balanced performance, speed and cost, suitable for medium complexity tasks",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.0008,
            "output_price": 0.002
        },
        {
            "id": "qwen-flash",
            "name": "Qwen Flash",
            "description": "Suitable for simple tasks with fast speed and low cost",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.00015,
            "output_price": 0.0015
        },
        {
            "id": "qwen-coder-turbo",
            "name": "Qwen Coder Turbo",
            "description": "Excellent code model, proficient in tool calling and environment interaction",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.001,
            "output_price": 0.004
        },
        {
            "id": "qwen-vl-max",
            "name": "Qwen VL Max",
            "description": "Multimodal model with powerful vision understanding",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.002,
            "output_price": 0.02
        },
        {
            "id": "qwen-audio-turbo",
            "name": "Qwen Audio Turbo",
            "description": "Audio understanding model",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 0.0016,
            "output_price": 0.01
        },
        {
            "id": "qwen-long",
            "name": "Qwen Long",
            "description": "Long text processing model with longest context window",
            "supports_tools": true,
            "context_length": 10000000,
            "input_price": 0.0005,
            "output_price": 0.002
        },
        {
            "id": "qwq-plus",
            "name": "QwQ Plus",
            "description": "Reasoning model with outstanding math and code capabilities",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 0.0016,
            "output_price": 0.004
        }
    ]',
    true,
    12,
    'https://bailian.console.aliyun.com'
)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    base_url = EXCLUDED.base_url,
    models = EXCLUDED.models,
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order,
    docs_url = EXCLUDED.docs_url;
