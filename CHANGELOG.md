# Changelog

All notable changes to this extension are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Commands run in a language with no grammar (or on a document tree-sitter cannot parse) now report why in the status bar instead of doing nothing silently.
- Multiple cursors resolving into the same construct — or into a construct and one nested inside it — no longer corrupt the document. All commands now collapse overlapping targets to the outermost one; previously only the recursive variants did.

## [1.1.1] - 2026-06-18

### Fixed

- Excluded `CLAUDE.md` from the packaged `.vsix` so internal project notes are no longer shipped to the Marketplace.

## [1.1.0] - 2026-06-14

### Added

- **PHP support.** All commands (`tree-join.toggle`, `tree-join.split`, `tree-join.join`, `tree-join.splitRecursive`, `tree-join.joinRecursive`) now work in `php` files, on these constructs:
  - Arrays: `array_creation_expression`, covering both the `[…]` and legacy `array(…)` forms.
  - Calls & signatures: `arguments`, `formal_parameters`.
  - Imports: `namespace_use_group` (group `use Foo\{A, B}`).
  - Match arms: `match_block`.
- The PHP `tree-sitter-php` WASM grammar, lazy-loaded on first command like the existing grammars.
- PHP-aware join guards: `#` (as well as `//`) line comments are recognized and block a join. The group-use list never emits a trailing comma on split, since one is a syntax error there.

### Changed

- Descriptor resolution is now grammar-keyed internally, so additional languages can be added by contributing a grammar and a descriptor table without touching the transforms.

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

[1.1.1]: https://github.com/e-newton/tree-join/releases/tag/v1.1.1
[1.1.0]: https://github.com/e-newton/tree-join/releases/tag/v1.1.0
[1.0.0]: https://github.com/e-newton/tree-join/releases/tag/v1.0.0
