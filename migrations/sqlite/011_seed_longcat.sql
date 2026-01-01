-- Seed Longcat provider type with latest models from LongCat API
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
            "description": "高性能通用对话模型",
            "supports_tools": true,
            "context_length": 32768,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "LongCat-Flash-Thinking",
            "name": "LongCat Flash Thinking",
            "description": "深度思考模型",
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
