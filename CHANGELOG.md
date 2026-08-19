# Changelog

All notable changes to this extension are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-08-19

### Added

- **PHP array destructuring.** All commands now work on a destructuring target — `[$a, $b] = $c` and the legacy `list($a, $b) = $c` — including the keyed form `['a' => $x, 'b' => $y] = $row`, by-reference targets, and skipped slots. These parse as `list_literal`, not `array_creation_expression`, so they were previously unsupported even though PHP arrays were.
- **JSON and JSONC support.** All commands (`tree-join.toggle`, `tree-join.split`, `tree-join.join`, `tree-join.splitRecursive`, `tree-join.joinRecursive`) now work in `json` and `jsonc` files, on `array` and `object` — so `package.json` dependency blocks, `tsconfig.json` option objects, and long string arrays flip between one line and many like any other construct.
- The `tree-sitter-json` WASM grammar, lazy-loaded on first command like the existing grammars. It serves both language ids and adds ~6 KB to the package.
- JSON-aware split behavior: a split never emits a trailing comma, whatever `tree-join.trailingComma` is set to. One is invalid in strict JSON, and even in `jsonc` the JSON grammar cannot parse it, so the result would be text Tree Join could no longer re-parse.
- JSONC comment handling: a `//` comment inside the construct refuses a join (joining would swallow the rest of the line), while a `/* … */` comment joins inline.
- TypeScript `interface` and `enum` bodies are now supported targets. Putting the cursor inside `interface Foo { a: string; b: number }` or `enum E { A, B, C = 3 }` previously did nothing; all five commands now split, join, and toggle them like object literals and type literals. `const enum` works the same way, and interface bodies keep whichever member separator you wrote (`;` or `,`).

### Changed

- The five Tree Join commands are now hidden in the Command Palette unless the active editor is a language the extension supports (TypeScript, TSX, JavaScript, JSX, PHP, and JSON/JSONC). They previously showed up in every file, where they could only ever be a no-op.
- Updated the build and test toolchain (esbuild, prettier, typescript-eslint, mocha, the `@vscode/test-*` and `vsce` tooling, and the `@types/vscode` typings) to current releases. No change to extension behaviour; the shipped bundle is the same size as before and still unminified.

## [1.1.2] - 2026-08-18

### Fixed

- Commands run in a language with no grammar (or on a document tree-sitter cannot parse) now report why in the status bar instead of doing nothing silently.
- Multiple cursors resolving into the same construct — or into a construct and one nested inside it — no longer corrupt the document. All commands now collapse overlapping targets to the outermost one; previously only the recursive variants did.
- `tree-join.joinRecursive` now honours the `tree-join.bracketSpacing` setting. It previously rebuilt the join options for each step and forwarded only `maxJoinLength`, so `bracketSpacing: false` was dropped and every brace — inner and outer — was padded anyway.

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

[1.2.0]: https://github.com/e-newton/tree-join/releases/tag/v1.2.0
[1.1.2]: https://github.com/e-newton/tree-join/releases/tag/v1.1.2
[1.1.1]: https://github.com/e-newton/tree-join/releases/tag/v1.1.1
[1.1.0]: https://github.com/e-newton/tree-join/releases/tag/v1.1.0
[1.0.0]: https://github.com/e-newton/tree-join/releases/tag/v1.0.0
