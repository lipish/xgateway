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
-- Seed Volcengine provider type with latest models
-- https://www.volcengine.com/docs/82379/1330310

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'volcengine',
    'Volcengine',
    'https://ark.cn-beijing.volces.com/api/v3',
    'doubao-seed-1-8-251215',
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
);-- Seed Aliyun provider type with latest models from DashScope
-- https://help.aliyun.com/zh/model-studio/models

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'aliyun',
    'Aliyun Bailian (百炼)',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'qwen3-max',
    '[
        {
            "id": "qwen3-max",
            "name": "Qwen3 Max",
            "description": "Suitable for complex, multi-step tasks with strongest capabilities",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0032,
            "output_price": 0.0128
        },
        {
            "id": "qwen3-plus",
            "name": "Qwen3 Plus", 
            "description": "Balanced performance, speed and cost, suitable for medium complexity tasks",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.0008,
            "output_price": 0.002
        },
        {
            "id": "qwen3-flash",
            "name": "Qwen3 Flash",
            "description": "Suitable for simple tasks with fast speed and low cost",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.00015,
            "output_price": 0.0015
        },
        {
            "id": "qwen3-coder",
            "name": "Qwen3 Coder",
            "description": "Excellent code model, proficient in tool calling and environment interaction",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.001,
            "output_price": 0.004
        },
        {
            "id": "qwen3-vl-max",
            "name": "Qwen3 VL Max",
            "description": "Multimodal model with powerful vision understanding",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.002,
            "output_price": 0.02
        },
        {
            "id": "qwen3-audio-turbo",
            "name": "Qwen3 Audio Turbo",
            "description": "Audio understanding model",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 0.0016,
            "output_price": 0.01
        },
        {
            "id": "qwen3-rerank",
            "name": "Qwen3 ReRank",
            "description": "Text ranking model",
            "supports_tools": false,
            "context_length": 30000,
            "input_price": 0.0005,
            "output_price": 0.0005
        },
        {
            "id": "text-embedding-v4",
            "name": "Text Embedding V4",
            "description": "Text embedding model supporting 100+ mainstream languages",
            "supports_tools": false,
            "context_length": 8192,
            "input_price": 0.0005,
            "output_price": 0.0005
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
);-- Seed Moonshot provider type with latest models from Moonshot AI
-- Based on publicly available information about Moonshot AI models

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'moonshot',
    'Moonshot AI',
    'https://api.moonshot.cn/v1',
    'moonshot-v1-8k',
    '[
        {
            "id": "moonshot-v1-8k",
            "name": "Moonshot V1 8K",
            "description": "Optimized for English scenarios with 8K context",
            "supports_tools": true,
            "context_length": 8192,
            "input_price": 0.012,
            "output_price": 0.012
        },
        {
            "id": "moonshot-v1-32k", 
            "name": "Moonshot V1 32K",
            "description": "Optimized for Chinese scenarios with 32K context",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 0.024,
            "output_price": 0.024
        },
        {
            "id": "moonshot-v1-128k",
            "name": "Moonshot V1 128K", 
            "description": "Suitable for ultra-long text scenarios with 128K context",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.036,
            "output_price": 0.036
        },
        {
            "id": "moonshot-v1-auto",
            "name": "Moonshot V1 Auto",
            "description": "Auto-select model based on input length (8K/32K/128K)",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.024,
            "output_price": 0.024
        }
    ]',
    true,
    13,
    'https://platform.moonshot.cn/docs'
);-- Seed Longcat provider type with latest models from LongCat API
-- Based on https://longcat.chat/platform/docs/zh/

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'longcat',
    'LongCat',
    'https://api.longcat.chat/openai/v1',
    'LongCat-Flash-Chat',
    '[
        {
            "id": "LongCat-Flash-Chat",
            "name": "LongCat Flash Chat",
            "description": "High-performance general chat model",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "LongCat-Flash-Thinking",
            "name": "LongCat Flash Thinking",
            "description": "Deep thinking model",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]',
    true,
    14,
    'https://longcat.chat/platform/docs/zh/'
);
-- Seed Minimax provider type with latest models from Minimax API
-- Based on https://platform.minimax.io/docs/guides/models-intro

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'minimax',
    'MiniMax',
    'https://api.minimax.io/v1',
    'MiniMax-M2.1',
    '[
        {
            "id": "MiniMax-M2.1",
            "name": "MiniMax M2.1",
            "description": "230B parameters, 10B activation, optimized for code generation and refactoring",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2.1-lightning",
            "name": "MiniMax M2.1 Lightning",
            "description": "Same performance as M2.1 with faster inference speed",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2",
            "name": "MiniMax M2",
            "description": "200K context, 128K output, supports function calling and advanced reasoning",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-2.6-hd",
            "name": "Speech 2.6 HD",
            "description": "Ultimate similarity, ultra-high quality voice generation, supports 40 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-2.6-turbo",
            "name": "Speech 2.6 Turbo",
            "description": "Best cost-performance, low latency voice generation, supports 40 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-02-hd",
            "name": "Speech 02 HD",
            "description": "Enhanced replication similarity, high quality voice generation, supports 24 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-02-turbo",
            "name": "Speech 02 Turbo",
            "description": "Excellent prosody and stability, low latency, supports 24 languages",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-2.3",
            "name": "MiniMax Hailuo 2.3",
            "description": "Text-to-video and image-to-video, 1080p/768p resolution, 6-10 seconds duration",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-2.3Fast",
            "name": "MiniMax Hailuo 2.3 Fast",
            "description": "Image-to-video with ultimate physics control, high cost-effectiveness",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-02",
            "name": "MiniMax Hailuo 02",
            "description": "Text-to-video and image-to-video with SOTA instruction following and ultimate physics control",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "Music-2.0",
            "name": "Music 2.0",
            "description": "Text-to-music with enhanced musicality, natural vocals and smooth melodies",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]',
    true,
    15,
    'https://platform.minimax.io/docs/guides/models-intro'
);
-- Seed Tencent provider type with latest models from Tencent Hunyuan API
-- Based on https://cloud.tencent.com/document/product/1729/104753

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'tencent',
    'Tencent Hunyuan',
    'https://hunyuan.tencentcloudapi.com',
    'hunyuan-2.0-instruct-20251111',
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
);
-- Seed Zhipu provider type with latest models from Zhipu AI
-- Based on https://docs.z.ai/guides/overview/pricing

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'zhipu',
    'Zhipu AI',
    'https://open.bigmodel.cn/api/paas/v4',
    'glm-4.7',
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
);