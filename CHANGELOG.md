# Changelog

All notable changes to this extension are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- ESLint (flat config, `typescript-eslint` recommended-type-checked tier) and Prettier with project-wide formatting.
- `lint`, `lint:fix`, `format`, and `format:check` npm scripts; CI runs `lint` and `format:check` before `build`.
- Pre-commit hook via `simple-git-hooks` + `lint-staged` that runs Prettier on staged files.
- `.vscode/settings.json` and `.vscode/extensions.json` for format-on-save and recommended extensions.
