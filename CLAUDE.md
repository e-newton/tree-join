# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A VSCode extension ("Tree Join") that toggles/splits/joins TS/JS constructs (arrays, objects, calls, params, imports, JSX attribute lists, TS types) between single-line and multi-line form, using `web-tree-sitter` to resolve the construct under the cursor. Ships both a Node extension-host bundle and a browser bundle (for vscode.dev / github.dev).

## Commands

```sh
npm run typecheck          # tsc --noEmit (strict)
npm run lint               # eslint .   (lint:fix to auto-fix)
npm run format:check       # prettier --check .   (format to write)
npm run build              # esbuild -> dist/extension.js + dist/extension.web.js (prod)
npm run watch              # rebuild both bundles on change

npm test                   # vitest: unit + fixture-snapshot suites
npm run test:watch
npm run test:update        # UPDATE_FIXTURES=1 vitest run — regenerate snapshots
npx vitest run tests/unit/select.test.ts      # single test file
npx vitest run -t "name of test"              # single test by name

npm run test:integration   # @vscode/test-electron smoke (needs a display)
npm run test:web           # @vscode/test-web headless-chromium smoke

npm run build:wasm         # rebuild vendored grammars in wasm/ (needs emcc or Docker)
npm run package            # vsce package -> .vsix
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, format-check, build, unit/fixture tests, the Electron integration smoke, and the headless web smoke on every push/PR.

## Architecture

Per-command flow lives in `src/extension.ts` (`runOnCursors`): parse the document, resolve a target node for each cursor, compute a transform per target, then apply all edits in **one** `WorkspaceEdit` so undo is atomic. Cursor positions are remapped after the edit (`src/cursor.ts`).

- **`parser.ts`** — lazy-loads the `web-tree-sitter` runtime + TS/TSX grammar WASM on first command, caching a `Parser` per grammar. WASM is read from `dist/wasm/` via `vscode.workspace.fs` (works in both node and browser hosts). `parseSource.ts` holds the language-id → grammar mapping (`javascript`→`typescript` grammar, `*react`→`tsx`).
- **`select.ts`** — `findTarget` walks up from the cursor's descendant to the innermost **supported** ancestor.
- **`nodeTypes.ts`** — the heart of the system: `NODE_TYPES` is a data-driven table of `NodeTypeDescriptor`s (open/close tokens, separator(s), bracket spacing, how to enumerate children). To support a new construct, add a descriptor here; the transforms are generic over it. `isSupported`/`descriptorFor` gate everything.
- **`split.ts` / `join.ts`** — the two transforms, both returning a `TransformResult` (`TransformSuccess` or a `JoinRefusal`). Join refuses on `width` (result exceeds effective max line length) or `lineComment` (would swallow a `//`).
- **`recursive.ts`** — `splitRecursive` (outer-first) / `joinRecursive` (innermost-first) re-parse the working string between each step and re-anchor the target by position. Width is enforced only on the final outer join line.
- **`runs.ts`** — groups a node's children into element "runs" across separators (used for element counting and transform output).
- **`config.ts` / `configResolve.ts`** — read VSCode settings into `SplitOptions`/`JoinOptions`. `maxJoinLength: 0` falls back to the first `editor.rulers` column (then 100). Settings are `language-overridable`.
- **`types.ts`** — shared result/range/offset shapes. **`helpers.ts`** — VSCode ↔ tree-sitter position/range conversions.

## Build specifics

- `esbuild.config.mjs` builds both bundles from `src/extension.ts`. The web bundle runs the emscripten glue under `platform: 'browser'`; node `fs`/`path` requires are stubbed and `__dirname`/`__filename` are defined away (the file-system WASM-loading path never runs since we feed `wasmBinary` directly). The config module is importable by tests without triggering a build.
- **Never minify the published bundle.** The VS Marketplace scanner flags minified JS as "suspicious content"; `minify: false` is intentional.
- `wasm/` holds vendored grammar WASM, copied to `dist/wasm/` by the esbuild `copy-wasm` plugin on every build. `scripts/build-wasm.mjs` regenerates them from a pinned `tree-sitter-typescript` tag — only needed when bumping grammars.

## Tests

- Transform behavior is covered by ~300 `*.in.ts` ↔ `*.out.ts` snapshot fixtures under `tests/fixtures/`, driven by `tests/unit/runFixtures.test.ts` via `tests/runFixtures.ts`. **When changing transform output, add/adjust a fixture pair and run `npm run test:update`.** See `tests/fixtures/README.md` for layout, conventions (e.g. `.tsx` content lives in `.in.ts` in the `-tsx` dirs; refusals render as `// REFUSED: <code>`; toggle fixtures assert round-trip idempotency) and the coverage matrix.
- `tests/integration/` and `tests/web/` run inside a real extension host (Electron / browser) and are **excluded from vitest** — they use mocha globals and import `vscode`.
