# xgateway Python Wrapper

This package provides a Python CLI entry point that downloads the prebuilt `xgateway` binary for your platform the first time it runs, so `pip install` never triggers a local Rust build. The wrapper currently supports:

- macOS arm64 (Apple Silicon)
- macOS x86_64 (Intel)
- Linux x86_64

After installation, invoke `xgateway` from your shell and the wrapper will ensure the matching binary is fetched from the corresponding GitHub release.
