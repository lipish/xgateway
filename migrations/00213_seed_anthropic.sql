-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

-- Seed Anthropic provider type with latest models
-- https://docs.anthropic.com/en/docs/about-claude/models

INSERT INTO provider_types (id, label, base_url, models, enabled, sort_order, docs_url)
VALUES (
    'anthropic',
    'Anthropic',
    'https://api.anthropic.com',
    '[
        {
            "id": "claude-opus-4-6",
            "name": "Claude Opus 4.6",
            "description": "Most intelligent for agents and coding",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 5.0,
            "output_price": 25.0
        },
        {
            "id": "claude-sonnet-4-6",
            "name": "Claude Sonnet 4.6",
            "description": "Best balance of speed and intelligence",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 3.0,
            "output_price": 15.0
        },
        {
            "id": "claude-haiku-4-5-20251001",
            "name": "Claude Haiku 4.5",
            "description": "Fastest with near-frontier intelligence",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 1.0,
            "output_price": 5.0
        },
        {
            "id": "claude-sonnet-4-5-20250929",
            "name": "Claude Sonnet 4.5",
            "description": "Strong performance, 200K context",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 3.0,
            "output_price": 15.0
        },
        {
            "id": "claude-opus-4-5-20251101",
            "name": "Claude Opus 4.5",
            "description": "Latest Opus generation",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 5.0,
            "output_price": 25.0
        }
    ]',
    true,
    2,
    'https://docs.anthropic.com/en/docs/about-claude/models'
)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    base_url = EXCLUDED.base_url,
    models = EXCLUDED.models,
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order,
    docs_url = EXCLUDED.docs_url;
