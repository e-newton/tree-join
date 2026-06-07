# Changelog

All notable changes to this extension are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-07

First public release.

### Added

- **Commands:** `tree-join.toggle`, `tree-join.split`, `tree-join.join`, `tree-join.splitRecursive`, and `tree-join.joinRecursive`, available from the Command Palette. No default keybindings.
- **Supported constructs** across `typescript`, `typescriptreact`, `javascript`, and `javascriptreact`:
  - Literals: `array`, `object`.
  - Destructuring patterns: `array_pattern`, `object_pattern`.
  - Calls & signatures: `arguments`, `formal_parameters`.
  - Modules: `named_imports`, `export_clause`.
  - TypeScript types: `type_arguments`, `type_parameters`, `tuple_type`, `object_type`.
  - JSX attribute lists on `jsx_opening_element` / `jsx_self_closing_element`.
- **Tree-sitter selection** that resolves the cursor to the innermost supported ancestor node, via the bundled `web-tree-sitter` runtime and TypeScript/TSX WASM grammars (lazy-loaded on first command).
- **Multi-cursor support:** each cursor transforms independently and all edits apply as one atomic undo step, with cursor restoration.
- **Join guards:** refuses to join when the result would exceed `tree-join.maxJoinLength` or would discard a `//` line comment, surfacing the reason in the status bar.
- **Settings:** `tree-join.maxJoinLength`, `tree-join.trailingComma` (`add`/`preserve`/`never`), and `tree-join.bracketSpacing`, all `language-overridable`.
- **Web extension target:** runs in `vscode.dev` / `github.dev` via a browser bundle (`dist/extension.web.js`).
- **Quality tooling:** ESLint (flat config, `typescript-eslint` recommended-type-checked tier) and Prettier with project-wide formatting; `lint`, `lint:fix`, `format`, and `format:check` npm scripts; a `simple-git-hooks` + `lint-staged` pre-commit hook running Prettier on staged files.
- **Test suites:** ~300 `*.in.ts`/`*.out.ts` fixture snapshots, an `@vscode/test-electron` integration smoke, and an `@vscode/test-web` headless browser smoke, all run in CI.

[1.0.0]: https://github.com/e-newton/tree-join/releases/tag/v1.0.0
