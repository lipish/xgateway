-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

-- Seed Moonshot provider type with latest models from Moonshot AI
-- Based on publicly available information about Moonshot AI models

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'moonshot',
    'Moonshot AI',
    'https://api.moonshot.cn/v1',
    'kimi-k2-turbo-preview',
    '[
        {
            "id": "kimi-k2-0905-preview",
            "name": "Kimi K2 0905",
            "description": "Latest K2 model with 256K context, strong Agentic Coding",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-turbo-preview",
            "name": "Kimi K2 Turbo",
            "description": "High-speed K2 with 256K context, 60-100 tokens/s",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 8.0,
            "output_price": 58.0
        },
        {
            "id": "kimi-k2-0711-preview",
            "name": "Kimi K2 0711",
            "description": "Earlier K2 version with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-thinking",
            "name": "Kimi K2 Thinking",
            "description": "Deep reasoning model with 256K context",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 4.0,
            "output_price": 16.0
        },
        {
            "id": "kimi-k2-thinking-turbo",
            "name": "Kimi K2 Thinking Turbo",
            "description": "High-speed deep reasoning with 256K context",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 8.0,
            "output_price": 58.0
        },
        {
            "id": "kimi-latest",
            "name": "Kimi Latest",
            "description": "Auto-select model based on context (8K/32K/128K), vision support",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 2.0,
            "output_price": 10.0
        },
        {
            "id": "moonshot-v1-8k",
            "name": "Moonshot V1 8K",
            "description": "Classic v1 model with 8K context",
            "supports_tools": true,
            "context_length": 8192,
            "input_price": 2.0,
            "output_price": 10.0
        },
        {
            "id": "moonshot-v1-32k",
            "name": "Moonshot V1 32K",
            "description": "Classic v1 model with 32K context",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 5.0,
            "output_price": 20.0
        },
        {
            "id": "moonshot-v1-128k",
            "name": "Moonshot V1 128K",
            "description": "Classic v1 model with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 10.0,
            "output_price": 30.0
        }
    ]',
    true,
    13,
    'https://platform.moonshot.cn/docs/pricing/chat'
);
