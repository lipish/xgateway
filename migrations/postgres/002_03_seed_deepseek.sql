-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

-- Seed DeepSeek provider type with models and pricing info
-- https://api-docs.deepseek.com/zh-cn/quick_start/pricing

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'deepseek',
    'DeepSeek',
    'https://api.deepseek.com/v1',
    'deepseek-chat',
    '[
        {
            "id": "deepseek-chat",
            "name": "DeepSeek Chat",
            "description": "General chat model with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 2.0,
            "output_price": 8.0
        },
        {
            "id": "deepseek-reasoner",
            "name": "DeepSeek Reasoner",
            "description": "Reasoning model with 128K context, max 64K output",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 4.0,
            "output_price": 16.0
        }
    ]',
    true,
    10,
    'https://api-docs.deepseek.com/zh-cn/quick_start/pricing'
);
