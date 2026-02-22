use clap::{ArgAction, Args, Parser, Subcommand};
use llm_providers::get_providers_data;
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "provider-models")]
#[command(about = "Export/fetch provider models from llm_providers")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Subcommand)]
enum Command {
    Fetch(FetchArgs),
    Snapshot(SnapshotArgs),
}

#[derive(Args)]
struct FetchArgs {
    providers: Vec<String>,

    #[arg(short = 'o', long = "output", default_value = "scripts/fetched-models")]
    output: String,

    #[arg(short = 'j', long = "json")]
    json: Option<String>,

    #[arg(short = 'p', long = "print", action = ArgAction::SetTrue)]
    print_only: bool,

    #[arg(long = "sql", action = ArgAction::SetTrue)]
    sql: bool,
}

#[derive(Args)]
struct SnapshotArgs {
    #[arg(short = 'o', long = "output", default_value = "scripts/provider-models.json")]
    output: String,
}

#[derive(Serialize, Clone)]
struct OutputProvider {
    label: String,
    base_url: String,
    docs_url: Option<String>,
    models: Vec<Value>,
}

fn build_providers() -> BTreeMap<String, OutputProvider> {
    let mut output: BTreeMap<String, OutputProvider> = BTreeMap::new();
    for (provider_id, provider) in get_providers_data() {
        let models = provider
            .models
            .iter()
            .map(|model| serde_json::to_value(model).expect("serialize model"))
            .collect();

        output.insert(
            provider_id.clone(),
            OutputProvider {
                label: provider.label.clone(),
                base_url: provider.base_url.clone(),
                docs_url: provider.docs_url.clone(),
                models,
            },
        );
    }
    output
}

fn escape_sql(value: &str) -> String {
    value.replace('\'', "''")
}

fn json_to_sql(provider_id: &str, data: &OutputProvider) -> String {
    let models_json = serde_json::to_string_pretty(&data.models)
        .expect("serialize models")
        .replace('\'', "''");
    let docs_url = data.docs_url.clone().unwrap_or_default();

    format!(
        "-- {provider_id}\nINSERT INTO provider_types (id, label, base_url, models, enabled, sort_order, docs_url)\nVALUES (\n    '{provider_id}',\n    '{}',\n    '{}',\n    '{models_json}',\n    true,\n    0,\n    '{}'\n)\nON CONFLICT (id) DO UPDATE SET\n    models = EXCLUDED.models,\n    docs_url = EXCLUDED.docs_url;\n",
        escape_sql(&data.label),
        escape_sql(&data.base_url),
        escape_sql(&docs_url),
    )
}

fn write_json_file(path: &PathBuf, value: &impl Serialize) -> anyhow::Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let content = serde_json::to_string_pretty(value)?;
    fs::write(path, content)?;
    Ok(())
}

fn run_fetch(args: FetchArgs) -> anyhow::Result<i32> {
    let all_data = build_providers();

    let mut wanted: Vec<String> = if args.providers.is_empty() {
        all_data.keys().cloned().collect()
    } else {
        args.providers
    };
    wanted.sort();

    let filtered: BTreeMap<String, OutputProvider> = wanted
        .into_iter()
        .filter_map(|provider| all_data.get(&provider).cloned().map(|p| (provider, p)))
        .collect();

    if filtered.is_empty() {
        eprintln!("无匹配的提供商");
        return Ok(1);
    }

    let output_models: BTreeMap<String, Vec<Value>> = filtered
        .iter()
        .map(|(k, v)| (k.clone(), v.models.clone()))
        .collect();

    if args.print_only {
        println!("{}", serde_json::to_string_pretty(&output_models)?);
    }

    if let Some(json_path) = args.json {
        let path = PathBuf::from(json_path);
        write_json_file(&path, &output_models)?;
        if args.print_only {
            eprintln!("合并 JSON -> {}", path.display());
        } else {
            println!("合并 JSON -> {}", path.display());
        }
    }

    if !args.print_only {
        let output_dir = PathBuf::from(args.output);
        fs::create_dir_all(&output_dir)?;

        for (provider_id, data) in &filtered {
            let json_path = output_dir.join(format!("{provider_id}.json"));
            write_json_file(&json_path, &data.models)?;
            println!("  [{provider_id}] {} 个模型 -> {}", data.models.len(), json_path.display());

            if args.sql {
                let sql_path = output_dir.join(format!("{provider_id}.sql"));
                fs::write(&sql_path, json_to_sql(provider_id, data))?;
                println!("  [{provider_id}] SQL -> {}", sql_path.display());
            }
        }
    }

    println!("\n完成：{} 个提供商", filtered.len());
    Ok(0)
}

fn run_snapshot(args: SnapshotArgs) -> anyhow::Result<i32> {
    let data = build_providers();
    let path = PathBuf::from(args.output);
    write_json_file(&path, &data)?;

    println!("已生成 {}，共 {} 个提供商", path.display(), data.len());
    for (provider_id, provider) in &data {
        println!("  {}: {} 个模型", provider_id, provider.models.len());
    }

    Ok(0)
}

fn main() -> anyhow::Result<()> {
    let code = match Cli::parse().command {
        Command::Fetch(args) => run_fetch(args)?,
        Command::Snapshot(args) => run_snapshot(args)?,
    };

    if code != 0 {
        std::process::exit(code);
    }

    Ok(())
}
