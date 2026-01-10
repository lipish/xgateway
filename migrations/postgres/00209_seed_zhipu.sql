-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

-- Seed Zhipu provider type with latest models from Zhipu AI
-- Based on https://docs.z.ai/guides/overview/pricing

INSERT INTO provider_types (id, label, base_url, models, enabled, sort_order, docs_url)
VALUES (
    'zhipu',
    'Zhipu AI',
    'https://open.bigmodel.cn/api/paas/v4',
    '[
        {
            "id": "glm-4.7",
            "name": "GLM-4.7",
            "description": "Latest flagship model, released December 2025",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.6,
            "output_price": 2.2
        },
        {
            "id": "glm-4.6",
            "name": "GLM-4.6",
            "description": "Flagship model with 200K context, advanced coding ability",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.6,
            "output_price": 2.2
        },
        {
            "id": "glm-4.6v",
            "name": "GLM-4.6V",
            "description": "Vision model with multimodal capabilities",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.3,
            "output_price": 0.9
        },
        {
            "id": "glm-4.6v-flashx",
            "name": "GLM-4.6V-FlashX",
            "description": "Ultra-fast vision model",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.04,
            "output_price": 0.4
        },
        {
            "id": "glm-4.5",
            "name": "GLM-4.5",
            "description": "Strong performance with powerful reasoning and code generation, 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.6,
            "output_price": 2.2
        },
        {
            "id": "glm-4.5v",
            "name": "GLM-4.5V",
            "description": "Vision model with 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.6,
            "output_price": 1.8
        },
        {
            "id": "glm-4.5-x",
            "name": "GLM-4.5-X",
            "description": "Ultra-fast version with 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 2.2,
            "output_price": 8.9
        },
        {
            "id": "glm-4.5-air",
            "name": "GLM-4.5 Air",
            "description": "Best performance at same parameter scale, 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.2,
            "output_price": 1.1
        },
        {
            "id": "glm-4.5-airx",
            "name": "GLM-4.5 AirX",
            "description": "Fast inference with cost-effective pricing",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 1.1,
            "output_price": 4.5
        },
        {
            "id": "glm-4-32b-0414-128k",
            "name": "GLM-4-32B-0414-128K",
            "description": "32B parameter model with 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.1,
            "output_price": 0.1
        },
        {
            "id": "glm-4.6v-flash",
            "name": "GLM-4.6V-Flash",
            "description": "Free vision model",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "glm-4.5-flash",
            "name": "GLM-4.5-Flash",
            "description": "Free model with 128K context",
            "supports_tools": true,
            "context_length": 128000,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]',
    true,
    17,
    'https://docs.z.ai/guides/overview/pricing'
)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    base_url = EXCLUDED.base_url,
    models = EXCLUDED.models,
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order,
    docs_url = EXCLUDED.docs_url;
