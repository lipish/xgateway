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
            "description": "通用对话模型，支持 128K 上下文",
            "supports_tools": true,
            "context_length": 131072,
            "input_price": 2.0,
            "output_price": 8.0
        },
        {
            "id": "deepseek-reasoner",
            "name": "DeepSeek Reasoner",
            "description": "推理模型，支持 128K 上下文，最大输出 64K",
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
