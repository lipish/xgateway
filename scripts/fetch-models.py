#!/usr/bin/env python3
"""
获取各 LLM 提供商的最新模型列表（id、name、description、context_length、价格等）。

数据来源：migrations 提取 + 静态补充（OpenAI、Anthropic），无需 API Key。
更新模型数据：运行 python scripts/build-provider-models.py

用法：
  python scripts/fetch-models.py                    # 输出合并 JSON
  python scripts/fetch-models.py openai anthropic   # 指定提供商
  python scripts/fetch-models.py --print            # 打印到控制台
  python scripts/fetch-models.py --json models.json # 输出到文件
  python scripts/fetch-models.py --sql              # 生成 SQL 片段
"""

import argparse
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROVIDER_MODELS_PATH = os.path.join(SCRIPT_DIR, "provider-models.json")


def load_provider_models() -> dict:
    """加载 provider-models.json，若不存在则先运行 build"""
    if not os.path.isfile(PROVIDER_MODELS_PATH):
        print("provider-models.json 不存在，正在生成...", file=sys.stderr)
        import subprocess
        r = subprocess.run(
            [sys.executable, os.path.join(SCRIPT_DIR, "build-provider-models.py")],
            cwd=os.path.dirname(SCRIPT_DIR),
        )
        if r.returncode != 0:
            sys.exit(1)
    with open(PROVIDER_MODELS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def escape_sql(s: str) -> str:
    return s.replace("'", "''")


def json_to_sql(provider_id: str, data: dict) -> str:
    models = data.get("models", [])
    models_json = json.dumps(models, ensure_ascii=False, indent=8).replace("'", "''")
    label = data.get("label", provider_id)
    base_url = data.get("base_url", "")
    docs_url = data.get("docs_url", "")
    return f"""-- {provider_id}
INSERT INTO provider_types (id, label, base_url, models, enabled, sort_order, docs_url)
VALUES (
    '{provider_id}',
    '{escape_sql(label)}',
    '{escape_sql(base_url)}',
    '{models_json}',
    true,
    0,
    '{escape_sql(docs_url)}'
)
ON CONFLICT (id) DO UPDATE SET
    models = EXCLUDED.models,
    docs_url = EXCLUDED.docs_url;
"""


def main() -> int:
    ap = argparse.ArgumentParser(
        description="获取各提供商模型列表（来自 provider-models.json）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    ap.add_argument("providers", nargs="*", help="指定提供商，默认全部")
    ap.add_argument("-o", "--output", default="scripts/fetched-models", help="分文件输出目录")
    ap.add_argument("-j", "--json", metavar="FILE", help="输出合并 JSON 到指定文件")
    ap.add_argument("-p", "--print", dest="print_only", action="store_true", help="打印到控制台")
    ap.add_argument("--sql", action="store_true", help="生成 SQL migration 片段")
    args = ap.parse_args()

    all_data = load_provider_models()
    want = sorted(args.providers) if args.providers else sorted(all_data.keys())
    filtered = {k: all_data[k] for k in want if k in all_data}

    if not filtered:
        print("无匹配的提供商", file=sys.stderr)
        return 1

    # 输出结构：{ provider_id: [models] } 用于 --json
    output_models = {k: v.get("models", []) for k, v in filtered.items()}

    if args.print_only:
        print(json.dumps(output_models, ensure_ascii=False, indent=2))

    if args.json:
        os.makedirs(os.path.dirname(args.json) or ".", exist_ok=True)
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(output_models, f, ensure_ascii=False, indent=2)
        print(f"合并 JSON -> {args.json}", file=sys.stderr if args.print_only else sys.stdout)

    if not args.print_only:
        os.makedirs(args.output, exist_ok=True)
        for pid, data in filtered.items():
            models = data.get("models", [])
            out_path = os.path.join(args.output, f"{pid}.json")
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(models, f, ensure_ascii=False, indent=2)
            print(f"  [{pid}] {len(models)} 个模型 -> {out_path}")
            if args.sql:
                sql_path = os.path.join(args.output, f"{pid}.sql")
                with open(sql_path, "w", encoding="utf-8") as f:
                    f.write(json_to_sql(pid, data))
                print(f"  [{pid}] SQL -> {sql_path}")

    print(f"\n完成：{len(filtered)} 个提供商")
    return 0


if __name__ == "__main__":
    sys.exit(main())
