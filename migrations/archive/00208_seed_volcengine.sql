-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

-- Seed Volcengine provider type with latest models
-- https://www.volcengine.com/docs/82379/1330310

INSERT INTO provider_types (id, label, base_url, models, enabled, sort_order, docs_url)
VALUES (
    'volcengine',
    'Volcengine',
    'https://ark.cn-beijing.volces.com/api/v3',
    '[
        {
            "id": "doubao-seed-1-8-251215",
            "name": "Doubao Seed 1.8",
            "description": "Most powerful multimodal agent model with enhanced capabilities",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-code-preview-251028",
            "name": "Doubao Seed Code Preview",
            "description": "Programming enhanced - deep thinking, text generation, multimodal understanding, tool calling",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-lite-251015",
            "name": "Doubao Seed 1.6 Lite",
            "description": "Lightweight model with deep thinking, text generation, multimodal understanding, tool calling",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-flash-250828",
            "name": "Doubao Seed 1.6 Flash",
            "description": "Fast model with deep thinking, text generation, vision grounding, multimodal understanding",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-vision-250815",
            "name": "Doubao Seed 1.6 Vision",
            "description": "Vision model with deep thinking, multimodal understanding, GUI task processing",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-translation-250915",
            "name": "Doubao Seed Translation",
            "description": "Translation enhanced model",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "deepseek-v3-2-251201",
            "name": "DeepSeek V3.2",
            "description": "Deep thinking, text generation, tool calling",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "deepseek-v3-1-terminus",
            "name": "DeepSeek V3.1 Terminus",
            "description": "Deep thinking, text generation, tool calling",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "kimi-k2-thinking-251104",
            "name": "Kimi K2 Thinking",
            "description": "Deep thinking, tool calling",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seedance-1-5-pro-251215",
            "name": "Doubao Seedance 1.5 Pro",
            "description": "Powerful video generation model with high-precision audio-visual sync",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seedream-4-5-251128",
            "name": "Doubao Seedream 4.5",
            "description": "Powerful image generation model with multi-image fusion and strong editing consistency",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]',
    true,
    11,
    'https://www.volcengine.com/docs/82379/1330310'
)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    base_url = EXCLUDED.base_url,
    models = EXCLUDED.models,
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order,
    docs_url = EXCLUDED.docs_url;
