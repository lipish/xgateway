-- ============================================================
-- Seed Provider Types (Templates for all supported providers)
-- ============================================================
-- This file seeds the provider_types table with all supported
-- LLM providers and their model configurations.
-- ============================================================

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
