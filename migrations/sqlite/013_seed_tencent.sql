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
            "description": "混元2.0思考模型，显著增强复杂指令遵循、多轮及长文理解、代码、Agent、推理能力",
            "supports_tools": true,
            "context_length": 131072,
            "max_output": 65536,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-2.0-instruct-20251111",
            "name": "Tencent HY 2.0 Instruct",
            "description": "混元2.0指令模型，显著增强指令遵循、多轮及长文理解、文学创作、知识准确性、代码及推理能力",
            "supports_tools": true,
            "context_length": 131072,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-t1-latest",
            "name": "Hunyuan T1 Latest",
            "description": "业内首个超大规模 Hybrid-Transformer-Mamba 推理模型，扩展推理能力，超强解码速度",
            "supports_tools": true,
            "context_length": 32768,
            "max_output": 65536,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-a13b",
            "name": "Hunyuan A13B",
            "description": "混元MoE结构，总参数80B，激活13B，支持快慢思考模式切换",
            "supports_tools": true,
            "context_length": 229376,
            "max_output": 32768,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-turbos-latest",
            "name": "Hunyuan TurboS Latest",
            "description": "混元旗舰大模型最新版本，具备更强的思考能力，更优的体验效果",
            "supports_tools": true,
            "context_length": 32768,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-lite",
            "name": "Hunyuan Lite",
            "description": "升级为MOE结构，上下文窗口256k，在多项评测集上领先众多开源模型",
            "supports_tools": true,
            "context_length": 256000,
            "max_output": 6144,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-translation",
            "name": "Hunyuan Translation",
            "description": "支持33种语言互译和5种民族语言互译，WMT25比赛30种语言获得第一",
            "supports_tools": false,
            "context_length": 4096,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-translation-lite",
            "name": "Hunyuan Translation Lite",
            "description": "基于混元2B-Dense模型的翻译专项模型，支持16+种语言互译",
            "supports_tools": false,
            "context_length": 4096,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-large-role-latest",
            "name": "Hunyuan Large Role Latest",
            "description": "角色扮演专用模型，显著提升角色一致性与对话深度",
            "supports_tools": false,
            "context_length": 28672,
            "max_output": 4096,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-vision-1.5-instruct",
            "name": "Tencent HY Vision 1.5 Instruct",
            "description": "图生文快思考模型，在图像基础识别、图像分析推理等维度都有明显提升",
            "supports_tools": true,
            "context_length": 24576,
            "max_output": 16384,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-t1-vision-20250916",
            "name": "Hunyuan T1 Vision",
            "description": "视觉深度思考模型，在通用图文问答、视觉定位、OCR、图表、拍题解题、看图创作等任务上全面提升",
            "supports_tools": true,
            "context_length": 28672,
            "max_output": 20480,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-large-vision",
            "name": "Hunyuan Large Vision",
            "description": "基于混元Large训练的视觉语言大模型，支持任意分辨率多张图片+文本输入",
            "supports_tools": true,
            "context_length": 24576,
            "max_output": 8192,
            "input_price": 0.0,
            "output_price": 0.0
        },
        {
            "id": "hunyuan-turbos-vision-video",
            "name": "Hunyuan TurboS Vision Video",
            "description": "视频理解模型，支持视频描述、视频内容问答等基本的视频理解能力",
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
