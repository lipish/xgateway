-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

-- Seed Tencent provider type with latest models from Tencent Hunyuan API
-- Based on https://cloud.tencent.com/document/product/1729/104753

INSERT INTO provider_types (id, label, base_url, models, enabled, sort_order, docs_url)
VALUES (
    'tencent',
    'Tencent Hunyuan',
    'https://hunyuan.tencentcloudapi.com',
    '[
        {
            "id": "hunyuan-2.0-thinking-20251109",
            "name": "Tencent HY 2.0 Think",
            "description": "Hunyuan 2.0 thinking model with enhanced complex instruction following, multi-turn and long-text understanding, code, agent, and reasoning capabilities",
            "supports_tools": true,
            "context_length": 131072,
            "max_output": 65536,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-2.0-instruct-20251111",
            "name": "Tencent HY 2.0 Instruct",
            "description": "Hunyuan 2.0 instruction model with enhanced instruction following, multi-turn and long-text understanding, creative writing, knowledge accuracy, code and reasoning capabilities",
            "supports_tools": true,
            "context_length": 131072,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-t1-latest",
            "name": "Hunyuan T1 Latest",
            "description": "Industry''s first large-scale Hybrid-Transformer-Mamba reasoning model with extended reasoning capability and ultra-fast decoding speed",
            "supports_tools": true,
            "context_length": 32768,
            "max_output": 65536,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-a13b",
            "name": "Hunyuan A13B",
            "description": "Hunyuan MoE structure with 80B total parameters, 13B activation, supports fast/slow thinking mode switching",
            "supports_tools": true,
            "context_length": 229376,
            "max_output": 32768,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-turbos-latest",
            "name": "Hunyuan TurboS Latest",
            "description": "Latest version of Hunyuan flagship model with stronger thinking capabilities and better experience",
            "supports_tools": true,
            "context_length": 32768,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-lite",
            "name": "Hunyuan Lite",
            "description": "Upgraded to MOE structure with 256K context window, leading many open-source models in multiple benchmarks",
            "supports_tools": true,
            "context_length": 256000,
            "max_output": 6144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-translation",
            "name": "Hunyuan Translation",
            "description": "Supports 33 language translations and 5 ethnic language translations, ranked 1st in 30 languages at WMT25",
            "supports_tools": false,
            "context_length": 4096,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-translation-lite",
            "name": "Hunyuan Translation Lite",
            "description": "Translation specialized model based on Hunyuan 2B-Dense, supports 16+ language translations",
            "supports_tools": false,
            "context_length": 4096,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-large-role-latest",
            "name": "Hunyuan Large Role Latest",
            "description": "Role-playing specialized model with significantly improved character consistency and dialogue depth",
            "supports_tools": false,
            "context_length": 28672,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-vision-1.5-instruct",
            "name": "Tencent HY Vision 1.5 Instruct",
            "description": "Image-to-text fast thinking model with significant improvements in image recognition, analysis and reasoning",
            "supports_tools": true,
            "context_length": 24576,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-t1-vision-20250916",
            "name": "Hunyuan T1 Vision",
            "description": "Vision deep thinking model with comprehensive improvements in general image-text Q&A, visual grounding, OCR, charts, problem solving, and image-based creation",
            "supports_tools": true,
            "context_length": 28672,
            "max_output": 20480,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-large-vision",
            "name": "Hunyuan Large Vision",
            "description": "Vision-language model based on Hunyuan Large, supports arbitrary resolution multiple images + text input",
            "supports_tools": true,
            "context_length": 24576,
            "max_output": 8192,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-turbos-vision-video",
            "name": "Hunyuan TurboS Vision Video",
            "description": "Video understanding model supporting video description, video Q&A and other basic video understanding capabilities",
            "supports_tools": true,
            "context_length": 24576,
            "max_output": 8192,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]',
    true,
    16,
    'https://cloud.tencent.com/document/product/1729/104753'
)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    base_url = EXCLUDED.base_url,
    models = EXCLUDED.models,
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order,
    docs_url = EXCLUDED.docs_url;
