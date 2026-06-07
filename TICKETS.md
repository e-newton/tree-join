# tree-join — Tickets

Sequenced work breakdown for delivering the PRD. Each ticket is sized to be completable in one focused session and produces a verifiable artifact. Later tickets assume earlier tickets are done; "Depends on" calls out the hard prerequisites.

**Convention:** every ticket that adds production logic also adds unit tests for that logic in the same ticket. Test _infrastructure_ gets its own ticket (T-03); test _coverage_ is not deferred.

---

## Phase 1 — Foundation

### T-01: Repo scaffold + Hello World command

**Goal:** Get a buildable, installable VSIX with one command that proves activation works.
**Depends on:** —
**Deliverables:**

- `package.json` with `engines.vscode: ^1.85.0`, publisher `EricNewton`, name `tree-join`, MIT license, contributes one command `tree-join.helloWorld`.
- `tsconfig.json` (strict).
- `esbuild.config.mjs` building `src/extension.ts` → `dist/extension.js` (Node target, CommonJS, external `vscode`).
- `.gitignore`, `LICENSE` (MIT), minimal `README.md` stub.
- `src/extension.ts` exporting `activate`/`deactivate`, registering the hello-world command that shows a status-bar message.
- `activationEvents` for the four TS/JS languages.
  **Acceptance:**
- `npm run build` produces `dist/extension.js`.
- `vsce package` produces a `.vsix` that installs cleanly.
- Opening a `.ts` file and running `tree-join: Hello World` from the command palette shows the status-bar message.
  **Out of scope:** real commands, WASM, tests.

---

### T-02: WASM parser integration

**Goal:** Load tree-sitter and the TS/TSX grammars; expose `getTree(document)`.
**Depends on:** T-01.
**Deliverables:**

- Add `web-tree-sitter` dependency.
- Vendor `tree-sitter.wasm`, `tree-sitter-typescript.wasm`, `tree-sitter-tsx.wasm` under `wasm/`. esbuild config copies them to `dist/wasm/`.
- `src/parser.ts`:
  - `initParser(context: ExtensionContext)` — initializes `Parser` once, lazily.
  - `parserFor(languageId)` — returns a cached `Parser` configured with the right grammar; supports `typescript`, `typescriptreact`, `javascript`, `javascriptreact` (use TSX grammar for `*react`; TS grammar handles JS).
  - `getTree(document: TextDocument): Promise<Tree>` — parses the full document; no incremental parsing for v1.
- Asset URIs built via `Uri.joinPath(context.extensionUri, 'dist', 'wasm', …)` so they work in both Node and web bundles.
  **Acceptance:**
- Hello World command, when triggered, calls `getTree` and logs the root node type to the status bar — proves WASM loaded and parsed.
  **Out of scope:** node-type table, selection, transforms.

---

### T-03: Test infrastructure (vitest)

**Goal:** Unit-testable project with a fixture harness ready for transform tickets.
**Depends on:** T-01.
**Deliverables:**

- `vitest.config.ts` with TS support; `npm test` runs the suite.
- `tests/unit/` directory + one trivial passing test to prove the pipeline works.
- `tests/fixtures/` directory with a `runFixtures(dir, fn)` helper: walks `*.in.ts` files, calls `fn(input)`, snapshot-compares to `*.out.ts`. Add a single sample fixture pair that the helper consumes (no-op transform) to prove it works.
- CI placeholder: GitHub Actions workflow `.github/workflows/ci.yml` running install, typecheck, build, test.
  **Acceptance:**
- `npm test` passes locally.
- CI workflow runs green on push.
  **Out of scope:** integration tests (T-15), real fixtures.

---

## Phase 2 — Core vertical slice (literals only)

### T-04: Node-type registry

**Goal:** Single source of truth describing each supported node type's join/split shape.
**Depends on:** T-02.
**Deliverables:**

- `src/nodeTypes.ts` exporting a `NodeTypeDescriptor` interface and a `NODE_TYPES` table.
- A descriptor includes: tree-sitter `type` string, `open` token (e.g. `[`), `close` token, `separator` (`,`), `bracketSpacing: boolean` (true for object-like), and an `elementsField` indicating how to enumerate children (named children minus the open/close tokens, by default).
- v1 of the table includes **only `array` and `object`**; further types added by later tickets append entries.
- `isSupported(node): boolean` and `descriptorFor(node): NodeTypeDescriptor | undefined` helpers.
- Unit tests covering both lookups against fixture trees.
  **Acceptance:** unit tests pass; descriptor returns correct open/close/spacing for `[1,2,3]` and `{a:1}`.
  **Out of scope:** other node types; transform logic.

---

### T-05: Cursor → target node selection

**Goal:** Resolve a `Position` to the innermost supported ancestor node.
**Depends on:** T-04.
**Deliverables:**

- `src/select.ts` exporting `findTarget(tree: Tree, position: Position): SyntaxNode | undefined`.
- Algorithm: descend to the smallest named node containing the position, then walk up parents until `isSupported(node)`; return the first hit or `undefined`.
- Unit tests over hand-built source strings covering: cursor inside literal, cursor on bracket, cursor between siblings, cursor in nested literal (must return innermost), cursor in unsupported context (returns `undefined`).
  **Acceptance:** all selection unit tests pass.
  **Out of scope:** acting on the node.

---

### T-06: Split transform (literals only)

**Goal:** Produce the post-split text for `array`/`object` nodes.
**Depends on:** T-04, T-05.
**Deliverables:**

- `src/transform/split.ts` exporting `splitNode(node, source, opts) → { newText, range }`.
- Behavior:
  - Opens with the open token at end of current line (unchanged column for `open`).
  - Each element on its own line, indented one level deeper than the line containing the open token.
  - Closing token on its own line at the open token's indentation.
  - Adds trailing comma after the last element (always for now; setting wired in T-14).
  - Indent unit comes from a passed-in `IndentOptions` (tabSize, insertSpaces) — caller resolves from the editor.
- `src/transform/format.ts` for shared helpers (indent strings, line-of-position, etc.).
- Fixture pairs in `tests/fixtures/split/literals/` covering: short array, short object, already-multi-line (idempotent), nested literal (only the outer is split — children stay as-is), with inline `/* */` comment, with `//` line comment.
  **Acceptance:** all fixture snapshots match.
  **Out of scope:** join; non-literal node types; settings wiring.

---

### T-07: Join transform (literals only)

**Goal:** Produce the post-join text for `array`/`object` nodes, with refusal conditions.
**Depends on:** T-06.
**Deliverables:**

- `src/transform/join.ts` exporting `joinNode(node, source, opts) → { newText, range } | { refused: 'width' | 'lineComment' }`.
- Behavior:
  - Collapse to single line. Elements joined by `, ` (one space).
  - Object braces padded `{ a: 1 }`; array brackets not padded `[1, 2]` (driven by descriptor's `bracketSpacing`).
  - Trailing comma always removed.
  - Refuse with `width` if resulting line length > effective `maxJoinLength` (caller passes the effective value).
  - Refuse with `lineComment` if the node contains any `//` comment.
- Fixture pairs in `tests/fixtures/join/literals/` covering: multi-line array, multi-line object, with trailing comma, with block comment (preserved inline), too-long (expect refusal sentinel rendered as a special marker file).
  **Acceptance:** all fixture snapshots match; refusal cases produce the documented refusal codes.
  **Out of scope:** toggle, applying the edit.

---

### T-08: Apply edits + cursor restoration

**Goal:** Turn a transform result into a real document edit with the cursor where we want it.
**Depends on:** T-06, T-07.
**Deliverables:**

- `src/apply.ts` exporting `applyTransforms(editor, results)`:
  - Builds a single `WorkspaceEdit` covering every result.
  - Computes new selections by mapping each original cursor's logical position (node id + offset within element) into the new text.
  - Applies the edit; sets the editor's selections to the computed positions.
- Unit tests for the cursor-mapping function against representative before/after pairs (does not require VSCode at unit-test time — accepts plain `{ text, selections }` inputs).
  **Acceptance:** unit tests pass; visible smoke-test in T-09.
  **Out of scope:** integration test (T-16).

---

### T-09: Command registration + status-bar feedback + multi-cursor

**Goal:** Working toggle/split/join keybinding-ready commands for literals.
**Depends on:** T-08.
**Deliverables:**

- `package.json` registers `tree-join.toggle`, `tree-join.split`, `tree-join.join` with palette titles.
- `src/extension.ts` wires each command:
  1. Get active editor + parser + tree.
  2. For every cursor in the editor, run `findTarget` → choose direction (toggle: single-line→split, multi-line→join) → run the corresponding transform.
  3. Pass all results to `applyTransforms` in one undo step.
  4. Aggregate refusal/no-target outcomes; show one transient status-bar message summarizing them (`tree-join: no splittable node` / `... cannot join — line comment` / `... cannot join — exceeds max line length`).
- Remove the hello-world placeholder command.
  **Acceptance:**
- Manual end-to-end test on a real `.ts` file: cursor in `[1,2,3]` + `tree-join.toggle` produces multi-line; again produces single-line.
- Multi-cursor: two cursors in two literals → both transform in one undo.
- Cursor in plain code → status message, no edit.
  **Out of scope:** any node types other than literals; settings.

---

## Phase 3 — Scope expansion

### T-10: Calls, params, and destructuring

**Goal:** Add `arguments`, `formal_parameters`, `array_pattern`, `object_pattern` to the registry.
**Depends on:** T-09.
**Deliverables:**

- New entries in `NODE_TYPES`.
- Verify descriptors and existing transforms work unchanged; add per-type fixtures for split + join.
- Handle the edge case where `formal_parameters` is just `()` (zero elements) — no-op on split.
  **Acceptance:** fixtures pass; manual sanity check on a function call and an arrow with destructured params.
  **Out of scope:** other types; recursive.

---

### T-11: Imports/exports and JSX attributes

**Goal:** Add `named_imports`, `export_clause`, and JSX attribute lists.
**Depends on:** T-10.
**Deliverables:**

- Registry entries for `named_imports` and `export_clause` (object-like spacing).
- JSX attribute lists are not a single node in tree-sitter — they're a sequence of children on `jsx_opening_element` / `jsx_self_closing_element`. Add a synthetic descriptor mechanism that targets the attribute range (from after the tag name to before `>` or `/>`), with elements separated by whitespace (no comma). Splitting puts each attribute on its own line indented under the tag; joining puts them back on the tag's line space-separated.
- Fixtures for each.
  **Acceptance:** fixtures pass; manual sanity check on a real React component file.
  **Out of scope:** TS type nodes.

---

### T-12: TypeScript type nodes

**Goal:** Add `type_arguments`, `type_parameters`, `tuple_type`, `object_type`.
**Depends on:** T-11.
**Deliverables:**

- Registry entries.
- `tuple_type` uses `[` `]` and comma separator (like arrays).
- `object_type` uses `{` `}`, comma _or_ semicolon separator. Detect existing separator in the node; preserve it on split, default to `;` if the node is empty.
- Fixtures.
  **Acceptance:** fixtures pass; manual sanity check on a `type T = { a: string; b: number }`.
  **Out of scope:** recursion, settings.

---

## Phase 4 — Polish & release

### T-13: Recursive variants

**Goal:** Ship `tree-join.splitRecursive` and `tree-join.joinRecursive`.
**Depends on:** T-12.
**Deliverables:**

- New commands registered.
- Selection picks the same innermost target; transform then walks supported descendants depth-first.
- `splitRecursive` **skips single-element nodes** (descend into the element, leave the wrapper single-line).
- Order: split outer → split descendants (so the descendant indentation is correct after the outer split). Join: join descendants first → join outer.
- Fixtures covering recursive split, recursive join, and the single-element-skip rule.
  **Acceptance:** fixtures pass.
  **Out of scope:** settings.

---

### T-14: Settings wiring

**Goal:** Expose the three v1 settings and honor them in transforms.
**Depends on:** T-13.
**Deliverables:**

- `package.json` declares `tree-join.maxJoinLength`, `tree-join.trailingComma`, `tree-join.bracketSpacing` per PRD §8.
- `src/config.ts` reads settings for the active editor and resolves `maxJoinLength === 0` → first `editor.rulers[0]` if present, else `100`.
- Transforms accept these via an `opts` object and respect them:
  - `trailingComma: "add" | "preserve" | "never"` on split; join always strips.
  - `bracketSpacing` overrides the descriptor default.
  - `maxJoinLength` drives the width-refusal check.
- Unit tests over each setting.
  **Acceptance:** settings change behavior end-to-end; tests pass.
  **Out of scope:** any extra settings.

---

### T-15: Fixture coverage pass

**Goal:** Round out the fixture corpus to a regression-safe baseline.
**Depends on:** T-14.
**Deliverables:**

- For every node type × {split, join, toggle-idempotency}: at least one positive fixture and one tricky case (comment, nested, edge size).
- For each refusal: one fixture demonstrating the refusal code.
- README-friendly summary table of what's covered in `tests/fixtures/README.md`.
  **Acceptance:** `npm test` green with ≥ ~50 fixture cases.
  **Out of scope:** code changes (only tests).

---

### T-16: VSCode integration smoke test

**Goal:** Catch breakage in command registration and real-document edit application.
**Depends on:** T-14.
**Deliverables:**

- `@vscode/test-electron` runner under `tests/integration/`.
- Tests:
  1. Extension activates on opening a `.ts` file; all five commands appear in the command palette.
  2. `tree-join.toggle` on a fixture document produces the expected text and selection.
  3. Multi-cursor toggle applies as one undo step (verify `editor.action.undo` reverts everything).
- `npm run test:integration` script.
  **Acceptance:** integration tests pass locally and in CI (CI uses xvfb or VSCode's headless mode).
  **Out of scope:** exhaustive coverage; that's what fixtures are for.

---

### T-17: Web extension target

**Goal:** Run in `vscode.dev` / `github.dev`.
**Depends on:** T-09 (functional command) — can be done in parallel with T-10–T-16 if desired.
**Deliverables:**

- esbuild produces a second bundle `dist/extension.web.js` (browser target, format `cjs`, external `vscode`).
- `package.json` declares `browser` field alongside `main`.
- Audit `src/` for any Node-only imports (`fs`, `path`, `os`) and replace with `vscode.workspace.fs` / URI helpers if found.
- Manual smoke: load the unpackaged extension in `vscode.dev` via the Web Extension Tester and run toggle on a `.ts` file.
  **Acceptance:** runs in vscode.dev's tester.
  **Out of scope:** publishing.

---

### T-18: Release prep

**Goal:** Ready to publish v1.0.0 to Marketplace and Open VSX.
**Depends on:** T-15, T-16, T-17.
**Deliverables:**

- README with: feature blurb, animated GIF of toggle, list of supported node types, settings reference, recommended keybinding snippet, contributing notes.
- CHANGELOG.md (v1.0.0 entry).
- Extension icon (`images/icon.png`, 128×128).
- Publisher account registered on Marketplace and Open VSX.
- CI workflow extended with a `release` job (manual dispatch) that runs `vsce publish` and `ovsx publish` from tag.
- First publish performed manually for v1.0.0.
  **Acceptance:** extension installable from both registries; smoke-test install on a clean VSCode.
  **Out of scope:** anything not blocking the first release.

---

## Suggested order

Linear: T-01 → T-02 → T-03 → T-04 → T-05 → T-06 → T-07 → T-08 → T-09 _(first usable extension)_ → T-10 → T-11 → T-12 → T-13 → T-14 → T-15 → T-16 → T-17 → T-18.

T-17 (web target) can shift earlier if you'd rather web-proof the bundle before adding node types.
