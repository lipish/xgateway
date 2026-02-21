#!/usr/bin/env python3
"""
从 migrations 提取 + 静态补充，生成 provider-models.json。
无需 API Key，直接运行：python scripts/build-provider-models.py
"""

import json
import os
import re
import sys

MIGRATIONS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "migrations")

# 无 migration 的 provider 的静态数据（openai/anthropic 已迁入 migrations）
STATIC_MODELS: dict = {}


def extract_models_from_sql(path: str) -> tuple[str, str, str, list] | None:
    """从 migration SQL 提取 id, label, base_url, models"""
    try:
        with open(path, "r", encoding="utf-8") as f:
            sql = f.read()
    except OSError:
        return None
    m = re.search(r"VALUES\s*\(\s*'([^']+)'\s*,\s*'([^']*(?:''[^']*)*)'\s*,\s*'([^']+)'\s*,\s*'", sql)
    if not m:
        return None
    pid, label, base_url = m.groups()
    label = label.replace("''", "'")
    # 正则结束于第4个值的引号，下一字符即为 [
    start = m.end()
    depth = 0
    for i, c in enumerate(sql[start:], start):
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                models_json = sql[start:i + 1].replace("''", "'")
                try:
                    models = json.loads(models_json)
                    return (pid, label, base_url, models)
                except json.JSONDecodeError:
                    return None
    return None


def main() -> int:
    scripts_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(scripts_dir, "provider-models.json")
    result = {}

    # 从 migrations 提取
    if os.path.isdir(MIGRATIONS_DIR):
        for fn in sorted(os.listdir(MIGRATIONS_DIR)):
            if "seed" not in fn or not fn.endswith(".sql"):
                continue
            full_path = os.path.normpath(os.path.join(MIGRATIONS_DIR, fn))
            extracted = extract_models_from_sql(full_path)
            if extracted:
                pid, label, base_url, models = extracted
                result[pid] = {"label": label, "base_url": base_url, "models": models}

    # 合并静态数据（仅对无 migration 的 provider 补充）
    for pid, data in STATIC_MODELS.items():
        if pid not in result:
            result[pid] = {
                "label": data["label"],
                "base_url": data["base_url"],
                "docs_url": data.get("docs_url", ""),
                "models": data["models"],
            }

    # 为从 migration 来的补充 docs_url
    docs_map = {
        "aliyun": "https://help.aliyun.com/zh/dashscope/developer-reference/model-introduction",
        "zhipu": "https://open.bigmodel.cn/dev/howuse/model",
        "deepseek": "https://api-docs.deepseek.com/zh-cn/information/model_list",
        "volcengine": "https://www.volcengine.com/docs/82379/1099475",
        "tencent": "https://cloud.tencent.com/document/product/1729/104753",
        "moonshot": "https://platform.moonshot.cn/docs/guide/model-list",
        "minimax": "https://platform.minimaxi.com/document/models",
        "longcat": "https://longcat.chat/platform/docs/zh/",
    }
    for pid, data in result.items():
        if "docs_url" not in data and pid in docs_map:
            data["docs_url"] = docs_map[pid]

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"已生成 {out_path}，共 {len(result)} 个提供商")
    for pid, d in result.items():
        print(f"  {pid}: {len(d['models'])} 个模型")
    return 0


if __name__ == "__main__":
    sys.exit(main())
