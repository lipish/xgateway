-- Seed Moonshot provider type with latest models from Moonshot AI
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
            "description": "适合英文场景，8K上下文长度",
            "supports_tools": true,
            "context_length": 8192,
            "input_price": 0.012,
            "output_price": 0.012
        },
        {
            "id": "moonshot-v1-32k", 
            "name": "Moonshot V1 32K",
            "description": "适合中文场景，32K上下文长度",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 0.024,
            "output_price": 0.024
        },
        {
            "id": "moonshot-v1-128k",
            "name": "Moonshot V1 128K", 
            "description": "适合超长文本场景，128K上下文长度",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.036,
            "output_price": 0.036
        },
        {
            "id": "moonshot-v1-auto",
            "name": "Moonshot V1 Auto",
            "description": "自动选择模型，根据输入长度自动选择8K/32K/128K",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 0.024,
            "output_price": 0.024
        }
    ]',
    true,
    13,
    'https://platform.moonshot.cn/docs'
);