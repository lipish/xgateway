# OpenCode.md

## Commands

### Build
- **Rust**: `cargo build` or `cargo build --release`
- **React Admin**: `cd admin && npm run build`
- **Docs Site**: `cd docs-site && npm run build`

### Lint
- **JavaScript/TypeScript**: `npm run lint` (runs eslint and prettier checks)

### Test
- **Run all tests (Rust)**: `cargo test`
- **Run specific test (Rust)**: `cargo test <test-name>`
- **Admin Tests**: `cd admin && npm run test`

## Code Style Guidelines

### Imports
- Import order: Standard > Third-party > Internal modules
- Utilizes `@` paths for modules (e.g., `import { X } from '@/components/'`).

### Formatting
- Prettier enforced (`npm run lint` to check consistency).

### Types
- Use TypeScript for all React and utility files.
- Prefer `type` aliases for complex objects over `interface`.
- Avoid `any`; use `unknown` or stricter types.

### Naming Conventions
- Components: `PascalCase`.
- Utilities/Functions: `camelCase`.
- Test files: `<module>_tests.rs` (Rust), `*Test.tsx` (React).

### Error Handling
- Use `Result`/`Option` (Rust) and `try/await` (JS).
- Centralize error boundary components in React.

### General Guidelines
- Avoid magic strings or numbers; prefer constants.
- Tests must accompany all significant logic changes.