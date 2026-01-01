-- Seed Aliyun provider type with latest models from DashScope
-- https://help.aliyun.com/zh/model-studio/models

INSERT INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    'aliyun',
    'Aliyun DashScope',
    'https://dashscope.aliyuncs.com/compatible-mode/v1',
    'qwen3-max',
    '[
        {
            "id": "qwen3-max",
            "name": "Qwen3 Max",
            "description": "适合复杂、多步骤的任务，能力最强",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.0032,
            "output_price": 0.0128
        },
        {
            "id": "qwen3-plus",
            "name": "Qwen3 Plus", 
            "description": "效果、速度、成本均衡，适合中等复杂任务",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.0008,
            "output_price": 0.002
        },
        {
            "id": "qwen3-flash",
            "name": "Qwen3 Flash",
            "description": "适合简单任务，速度快、成本低",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.00015,
            "output_price": 0.0015
        },
        {
            "id": "qwen3-coder",
            "name": "Qwen3 Coder",
            "description": "卓越的代码模型，擅长工具调用和环境交互",
            "supports_tools": true,
            "context_length": 1000000,
            "input_price": 0.001,
            "output_price": 0.004
        },
        {
            "id": "qwen3-vl-max",
            "name": "Qwen3 VL Max",
            "description": "多模态模型，视觉理解能力强大",
            "supports_tools": true,
            "context_length": 262144,
            "input_price": 0.002,
            "output_price": 0.02
        },
        {
            "id": "qwen3-audio-turbo",
            "name": "Qwen3 Audio Turbo",
            "description": "音频理解模型",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 0.0016,
            "output_price": 0.01
        },
        {
            "id": "qwen3-rerank",
            "name": "Qwen3 ReRank",
            "description": "文本排序模型",
            "supports_tools": false,
            "context_length": 30000,
            "input_price": 0.0005,
            "output_price": 0.0005
        },
        {
            "id": "text-embedding-v4",
            "name": "Text Embedding V4",
            "description": "文本向量模型，支持100+主流语种",
            "supports_tools": false,
            "context_length": 8192,
            "input_price": 0.0005,
            "output_price": 0.0005
        },
        {
            "id": "qwen-long",
            "name": "Qwen Long",
            "description": "长文本处理模型，上下文窗口最长",
            "supports_tools": true,
            "context_length": 10000000,
            "input_price": 0.0005,
            "output_price": 0.002
        },
        {
            "id": "qwq-plus",
            "name": "QwQ Plus",
            "description": "推理模型，数学代码能力突出",
            "supports_tools": false,
            "context_length": 131072,
            "input_price": 0.0016,
            "output_price": 0.004
        }
    ]',
    true,
    12,
    'https://help.aliyun.com/zh/model-studio/models')
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    base_url = EXCLUDED.base_url,
    default_model = EXCLUDED.default_model,
    models = EXCLUDED.models,
    enabled = EXCLUDED.enabled,
    sort_order = EXCLUDED.sort_order,
    docs_url = EXCLUDED.docs_url;