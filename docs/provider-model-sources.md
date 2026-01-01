# Provider Model Sources

This document records the official documentation URLs for each provider's model list. Use these sources when updating provider models.

## Provider Model Documentation

### Volcengine (火山引擎)
- **Official Docs**: https://www.volcengine.com/docs/82379/1330310?lang=zh
- **Last Updated**: 2026-01-01
- **Migration File**: `migrations/sqlite/008_seed_volcengine.sql`, `migrations/postgres/008_seed_volcengine.sql`
- **Notes**: 
  - Chinese docs available with `?lang=zh` parameter
  - English docs available with `?lang=en` parameter
  - Includes model capabilities, context length, and rate limits

### DeepSeek
- **Official Docs**: https://api-docs.deepseek.com/zh-cn/quick_start/pricing
- **Last Updated**: Previously configured
- **Migration File**: `migrations/sqlite/007_seed_deepseek.sql`, `migrations/postgres/007_seed_deepseek.sql`
- **Notes**: Pricing information included

### Aliyun (阿里云)
- **Official Docs**: https://help.aliyun.com/zh/model-studio/models
- **Last Updated**: 2026-01-01
- **Migration File**: `migrations/sqlite/002_provider_types.sql`
- **Notes**: Chinese docs available, English version not available

### Tencent (腾讯)
- **Official Docs**: https://cloud.tencent.com/document/product/1729/104753
- **Last Updated**: 2026-01-01
- **Migration File**: `migrations/sqlite/013_seed_tencent.sql`, `migrations/postgres/013_seed_tencent.sql`
- **Notes**: HunYuan model documentation with complete model list

### Zhipu AI (智谱)
- **Official Docs**: https://docs.z.ai/guides/overview/pricing
- **Last Updated**: 2026-01-01
- **Migration File**: `migrations/sqlite/014_seed_zhipu.sql`, `migrations/postgres/014_seed_zhipu.sql`
- **Notes**: Complete GLM model series with pricing in USD per 1M tokens, includes GLM-4.7, GLM-4.6, vision models, and free Flash models

### Moonshot (月之暗面)
- **Official Docs**: https://platform.moonshot.cn/docs
- **Last Updated**: 2026-01-01
- **Migration File**: `migrations/sqlite/010_seed_moonshot.sql`, `migrations/postgres/010_seed_moonshot.sql`
- **Notes**: Kimi model documentation

### LongCat (长猫)
- **Official Docs**: https://longcat.chat/platform/docs/zh/
- **Last Updated**: 2026-01-01
- **Migration File**: `migrations/sqlite/011_seed_longcat.sql`, `migrations/postgres/011_seed_longcat.sql`
- **Notes**: LongCat Flash Chat and Thinking models, OpenAI and Anthropic API compatible

### MiniMax
- **Official Docs**: https://platform.minimax.io/docs/guides/models-intro
- **Last Updated**: 2026-01-01
- **Migration File**: `migrations/sqlite/012_seed_minimax.sql`, `migrations/postgres/012_seed_minimax.sql`
- **Notes**: Includes text, audio, video, and music models

### OpenAI
- **Official Docs**: https://platform.openai.com/docs/models
- **Migration File**: Not in database (configured via config file)
- **Notes**: Model list frequently updated

### Anthropic
- **Official Docs**: https://docs.anthropic.com/en/docs/about-claude/models
- **Migration File**: Not in database (configured via config file)
- **Notes**: Claude model family

## Update Process

When updating provider models:

1. **Fetch Latest Info**: Visit the provider's official documentation URL
2. **Use Firecrawl MCP**: Scrape the page content with `mcp__firecrawl-mcp__firecrawl_scrape`
3. **Create Migration**: Generate a new migration file in both `migrations/sqlite/` and `migrations/postgres/`
4. **Update Database**: Apply the migration to the database
5. **Test**: Verify the models appear correctly in the admin UI
6. **Commit**: Create a git commit with the changes
7. **Tag Release**: Create a new version tag if significant changes

## Migration File Naming

- Format: `NNN_seed_<provider_name>.sql`
- Example: `008_seed_volcengine.sql`
- Sequential numbering starting from last migration

## SQL Template

```sql
-- Seed <Provider Name> provider type with latest models
-- <Official Docs URL>

INSERT OR REPLACE INTO provider_types (id, label, base_url, default_model, models, enabled, sort_order, docs_url)
VALUES (
    '<provider_id>',
    '<Provider Name>',
    '<api_base_url>',
    '<default_model_id>',
    '[
        {
            "id": "<model_id>",
            "name": "<Model Display Name>",
            "description": "<Model Description>",
            "supports_tools": true/false,
            "context_length": <number>,
            "input_price": <price_per_1m_tokens>,
            "output_price": <price_per_1m_tokens>
        }
    ]',
    true,
    <sort_order>,
    '<docs_url>'
);
```

## Notes

- Always use English for the `label` field in database
- UI handles multi-language display separately
- Include pricing information when available (per 1M tokens)
- Document context length limits
- Mark tool calling support accurately