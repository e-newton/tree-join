# tree-join — PRD

VSCode extension that toggles, splits, and joins TypeScript/JavaScript array and object-like constructs using tree-sitter. Functional analogue of [treesj](https://github.com/Wansmer/treesj) for VSCode.

## 1. Goals

- Single keybinding to flip any supported TS/JS construct between single-line and multi-line form.
- Predictable, formatter-friendly output (Prettier-compatible defaults).
- Works in Node-based VSCode and in web (`vscode.dev`, `github.dev`).
- Publish to VSCode Marketplace and Open VSX.

Non-goals (v1): non-TS/JS languages, custom per-node layout templates, format-on-save, code actions / quick fixes.

## 2. Parser

- **web-tree-sitter** (WASM).
- Ship `tree-sitter.wasm` plus `tree-sitter-typescript.wasm` / `tree-sitter-tsx.wasm` as bundled assets.
- One `Parser` per language, lazily initialized on first command invocation.

## 3. Commands

| Command id                 | Behavior                                             |
| -------------------------- | ---------------------------------------------------- |
| `tree-join.toggle`         | If target node spans one line → split; else join.    |
| `tree-join.split`          | Force split (no-op if already multi-line).           |
| `tree-join.join`           | Force join (subject to width / comment guards).      |
| `tree-join.splitRecursive` | Split target and recurse into supported descendants. |
| `tree-join.joinRecursive`  | Join target and recurse into supported descendants.  |

No default keybindings. Recommended bindings documented in README.

## 4. Supported node types (v1)

Per language grammar, the following tree-sitter node types are joinable/splittable:

- **Literals**: `array`, `object`
- **Patterns**: `array_pattern`, `object_pattern` (destructuring)
- **Calls / definitions**: `arguments`, `formal_parameters`
- **Modules**: `named_imports`, `export_clause`
- **Types** (TS): `type_arguments`, `type_parameters`, `tuple_type`, `object_type`
- **JSX**: attribute list of `jsx_opening_element` / `jsx_self_closing_element`

Each node type has a small descriptor: open token, close token, separator (`,` for all v1 types), and "inner brace spacing" rule (object-like → space, others → no space).

## 5. Node selection

- Walk from the cursor's tree-sitter node up the tree.
- Pick the **innermost** ancestor whose type is in the supported set.
- With multiple cursors: resolve independently per cursor; collapse all resulting edits into one `WorkspaceEdit` so undo is atomic.
- If no supported node is found at a cursor, skip that cursor. If _all_ cursors miss, show a transient status-bar message: `tree-join: no splittable node at cursor`.

## 6. Transform rules

### Split

- Place opening bracket at end of current line (no newline before it).
- Each element on its own line, indented one level deeper than the line of the opening bracket.
- Closing bracket on its own line, indented to match the opening bracket's line.
- Add trailing comma after the last element (subject to `trailingComma` setting).
- Indentation unit and width: read from `TextEditor.options.tabSize` / `insertSpaces` for the active editor.

### Join

- Collapse to single line with elements separated by `, ` (one space after comma).
- Object-like nodes (`object`, `object_pattern`, `object_type`, `named_imports`, `export_clause`): a single space inside both braces (`{ a: 1 }`).
- Non-object nodes (`array`, `array_pattern`, `arguments`, `formal_parameters`, `tuple_type`, `type_arguments`, `type_parameters`, JSX attrs): no padding (`[1, 2]`).
- Remove trailing comma (always, regardless of setting — joining + trailing comma is never idiomatic).
- **Refuse to join** if the resulting line length would exceed `tree-join.maxJoinLength` (default: first value in `editor.rulers` if present, else 100). Surface refusal in status bar.

### Comments

- Block comments (`/* … */`): preserved inline on join, preserved on the appropriate line on split.
- Line comments (`// …`) inside the node: on split, preserved with their associated element. On join, **refuse** with status-bar message: `tree-join: cannot join — line comment would be lost`.

### Cursor placement

- Identify the token/element under the cursor before the edit (by tree-sitter node id and offset within it).
- After the edit, restore the cursor to the same logical token. Fallback: place at the start of the transformed node.

## 7. Toggle decision rule

`target.startPosition.row === target.endPosition.row` → split, otherwise → join. No width-based logic; that lives only in the join guard.

## 8. Settings

```jsonc
{
  "tree-join.maxJoinLength": {
    "type": "number",
    "default": 100,
    "description": "Max line length for a join result. Falls back to the first editor.rulers value if 0.",
  },
  "tree-join.trailingComma": {
    "type": "string",
    "enum": ["add", "preserve", "never"],
    "default": "add",
    "description": "Trailing comma behavior on split. Join always removes.",
  },
  "tree-join.bracketSpacing": {
    "type": "boolean",
    "default": true,
    "description": "Pad inside object-like braces on join.",
  },
}
```

## 9. Activation

```jsonc
"activationEvents": [
  "onLanguage:typescript",
  "onLanguage:typescriptreact",
  "onLanguage:javascript",
  "onLanguage:javascriptreact"
]
```

WASM loading is deferred until the first command fires for a given language.

## 10. Build & packaging

- Language: TypeScript (strict).
- Bundler: esbuild. Single bundle for Node entry (`./dist/extension.js`) and one for web entry (`./dist/extension.web.js`).
- `package.json` declares both `main` and `browser`.
- WASM assets copied to `./dist/wasm/` and loaded via `Uri.joinPath(context.extensionUri, 'dist', 'wasm', …)` (works in both Node and web).
- `engines.vscode`: `^1.85.0`.
- License: MIT.

## 11. Testing

- **Unit (vitest)**: pure transformer. Given `{ source, cursorOffset, nodeType, direction, settings }` → `{ source, cursorOffset }`. Covers per-node-type formatting rules, trailing comma handling, brace spacing, max-width refusal, comment guards.
- **Fixture snapshots**: `tests/fixtures/<node-type>/<case>.in.ts` ↔ `.out.ts` pairs, driven by vitest.
- **Integration (`@vscode/test-electron`)**: smoke suite — extension activates, commands are registered, a representative split + join round-trip applies the expected `WorkspaceEdit` to a real document with the expected cursor outcome.

## 12. Repository layout

```
.
├── PRD.md
├── README.md
├── LICENSE
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── src/
│   ├── extension.ts          # activate(), command registration
│   ├── parser.ts             # web-tree-sitter init + caching
│   ├── nodeTypes.ts          # supported-type table + descriptors
│   ├── select.ts             # cursor → target node
│   ├── transform/
│   │   ├── split.ts
│   │   ├── join.ts
│   │   └── format.ts         # shared indent/spacing helpers
│   └── apply.ts              # build & apply WorkspaceEdit, restore cursor
├── tests/
│   ├── unit/
│   ├── fixtures/
│   └── integration/
└── wasm/                     # vendored .wasm grammars (copied to dist on build)
```

## 13. Publishing

- Publisher id: `EricNewton`. Final extension id: `EricNewton.tree-join`.
- CI: GitHub Actions running typecheck, vitest, `vsce package`. Manual `vsce publish` and `ovsx publish` for v1; consider automating on tag for v1.1.
- README includes animated demos for split and join.

## 14. Resolved details

- `maxJoinLength` is a single numeric setting. The value `0` means "use the first `editor.rulers` entry if present, else 100".
- `splitRecursive` skips single-element nodes (the wrapper stays single-line; recursion still descends into the lone element).
