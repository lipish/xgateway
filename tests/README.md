# XGateway Tests

This directory will contain tests for XGateway.

## 🚧 Status

Tests are being redesigned and reimplemented. Old test scripts have been removed.

## 📋 Planned Tests

### Unit Tests
- Configuration loading
- Provider override logic
- Client adapter detection
- Format conversion utilities

### Integration Tests
- End-to-end API tests
- Provider integration tests
- Application mode tests

### Test Framework

Tests will be implemented using:
- Rust's built-in test framework (`cargo test`)
- Integration tests in `tests/` directory
- Unit tests in source files

## 🚀 Running Tests

```bash
# Run all tests
cargo test

# Run specific test
cargo test test_name

# Run with output
cargo test -- --nocapture

# Run integration tests only
cargo test --test integration_test_name
```

## 📚 Documentation

For more information, see:
- [Main README](../README.md)
- [Quick Start Guide](../docs/QUICK_START.md)
- [Changelog](../CHANGELOG.md)

