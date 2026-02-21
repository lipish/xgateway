-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

-- Seed OpenAI provider type with latest models
-- https://platform.openai.com/docs/models
-- https://developers.openai.com/api/docs/guides/latest-model

INSERT INTO provider_types (id, label, base_url, models, enabled, sort_order, docs_url)
VALUES (
    'openai',
    'OpenAI',
    'https://api.openai.com/v1',
    '[
        {
            "id": "gpt-5.2",
            "name": "GPT-5.2",
            "description": "Best general-purpose, complex reasoning, tool calling, vision",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.5,
            "output_price": 10.0
        },
        {
            "id": "gpt-5.2-pro",
            "name": "GPT-5.2 Pro",
            "description": "Harder thinking for tough problems",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 5.0,
            "output_price": 20.0
        },
        {
            "id": "gpt-5.2-codex",
            "name": "GPT-5.2 Codex",
            "description": "Interactive coding products",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.5,
            "output_price": 10.0
        },
        {
            "id": "gpt-5-mini",
            "name": "GPT-5 Mini",
            "description": "Cost-optimized reasoning and chat",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.4,
            "output_price": 1.6
        },
        {
            "id": "gpt-5-nano",
            "name": "GPT-5 Nano",
            "description": "High-throughput, simple tasks",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.1,
            "output_price": 0.4
        },
        {
            "id": "gpt-4o",
            "name": "GPT-4o",
            "description": "Flagship multimodal model",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.5,
            "output_price": 10.0
        },
        {
            "id": "gpt-4o-mini",
            "name": "GPT-4o Mini",
            "description": "Fast and affordable",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.15,
            "output_price": 0.6
        },
        {
            "id": "gpt-4.1",
            "name": "GPT-4.1",
            "description": "Advanced reasoning",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.5,
            "output_price": 10.0
        },
        {
            "id": "o1",
            "name": "o1",
            "description": "Advanced reasoning model",
            "supports_tools": false,
            "context_length": 200000,
            "input_price": 15.0,
            "output_price": 60.0
        },
        {
            "id": "o1-mini",
            "name": "o1 Mini",
            "description": "Efficient reasoning",
            "supports_tools": false,
            "context_length": 128000,
            "input_price": 3.0,
            "output_price": 12.0
        },
        {
            "id": "gpt-3.5-turbo",
            "name": "GPT-3.5 Turbo",
            "description": "Fast and economical",
            "supports_tools": true,
            "context_length": 16385,
            "input_price": 0.5,
            "output_price": 1.5
        }
    ]',
    true,
    1,
    'https://platform.openai.com/docs/models'
)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    base_url = EXCLUDED.base_url,
    models = EXCLUDED.models,
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order,
    docs_url = EXCLUDED.docs_url;
