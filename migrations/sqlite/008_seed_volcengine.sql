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
            "description": "豆包最强多模态 Agent 模型 - 更强 Agent 能力，多模态理解升级",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-code-preview-251028",
            "name": "Doubao Seed Code Preview",
            "description": "编程场景增强 - 深度思考、文本生成、多模态理解、工具调用",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-lite-251015",
            "name": "Doubao Seed 1.6 Lite",
            "description": "轻量级模型 - 深度思考、文本生成、多模态理解、工具调用",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-flash-250828",
            "name": "Doubao Seed 1.6 Flash",
            "description": "快速模型 - 深度思考、文本生成、视觉定位、多模态理解",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-1-6-vision-250815",
            "name": "Doubao Seed 1.6 Vision",
            "description": "视觉模型 - 深度思考、多模态理解、GUI任务处理",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seed-translation-250915",
            "name": "Doubao Seed Translation",
            "description": "翻译增强模型",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "deepseek-v3-2-251201",
            "name": "DeepSeek V3.2",
            "description": "深度思考、文本生成、工具调用",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "deepseek-v3-1-terminus",
            "name": "DeepSeek V3.1 Terminus",
            "description": "深度思考、文本生成、工具调用",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "kimi-k2-thinking-251104",
            "name": "Kimi K2 Thinking",
            "description": "深度思考、工具调用",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seedance-1-5-pro-251215",
            "name": "Doubao Seedance 1.5 Pro",
            "description": "豆包最强视频生成模型 - 音画高精同步，影视级运动和情绪表现",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "doubao-seedream-4-5-251128",
            "name": "Doubao Seedream 4.5",
            "description": "豆包最强图片生成模型 - 多图稳定融合，超强编辑一致性",
            "supports_tools": false,
            "context_length": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        }
    ]',
    true,
    11,
    'https://www.volcengine.com/docs/82379/1330310'
);