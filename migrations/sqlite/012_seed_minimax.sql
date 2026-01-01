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
            "description": "230B参数量，10B激活量，优化代码生成和重构",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2.1-lightning",
            "name": "MiniMax M2.1 Lightning",
            "description": "与M2.1相同性能，推理速度更快",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-M2",
            "name": "MiniMax M2",
            "description": "200K上下文，128K输出，支持函数调用和高级推理",
            "supports_tools": true,
            "context_length": 200000,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-2.6-hd",
            "name": "Speech 2.6 HD",
            "description": "终极相似度，超高质量语音生成，支持40种语言",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-2.6-turbo",
            "name": "Speech 2.6 Turbo",
            "description": "极致性价比，低延迟语音生成，支持40种语言",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-02-hd",
            "name": "Speech 02 HD",
            "description": "更强复制相似度，高质量语音生成，支持24种语言",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "speech-02-turbo",
            "name": "Speech 02 Turbo",
            "description": "卓越韵律和稳定性，低延迟，支持24种语言",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-2.3",
            "name": "MiniMax Hailuo 2.3",
            "description": "文生视频和图生视频，1080p/768p分辨率，6-10秒时长",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-2.3Fast",
            "name": "MiniMax Hailuo 2.3 Fast",
            "description": "图生视频，极致物理掌控力，性价比高",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "MiniMax-Hailuo-02",
            "name": "MiniMax Hailuo 02",
            "description": "文生视频和图生视频，SOTA指令遵循，极致物理掌控",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "Music-2.0",
            "name": "Music 2.0",
            "description": "文生音乐，增强音乐性，自然人声和流畅旋律",
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
