# Fixture corpus

Snapshot fixtures that exercise the split / join / toggle transforms end-to-end
on real tree-sitter parses. There are **445** `*.in.ts` ↔ `*.out.ts` pairs (337
TS/JS/TSX + 69 PHP + 39 JSON/JSONC), driven by `tests/unit/runFixtures.test.ts`
via the `runFixtures` helper in `tests/runFixtures.ts`.

## How a fixture works

Each case is a pair of sibling files in a directory:

| File             | Role                                                                 |
| ---------------- | -------------------------------------------------------------------- |
| `<name>.in.ts`   | Input source. The harness finds the first supported node and acts.   |
| `<name>.out.ts`  | Expected source after the transform. Snapshot-compared exactly.      |
| `<name>.opts.json` | Optional. Per-fixture transform options (e.g. `{ "tabSize": 4 }`). |

Conventions:

- **`.tsx` content lives in `.in.ts` files** in the `-tsx` / `jsx_*` dirs; the
  harness parses them with the `typescriptreact` grammar regardless of suffix.
- **PHP content also lives in `.in.ts` files** in the `*-php` dirs (the `.in.ts`
  suffix is the harness's, not the language's); the harness parses them with the
  `php` grammar. PHP inputs begin with `<?php`.
- **JSON content also lives in `.in.ts` files** in the `*-json` / `*-jsonc` dirs;
  the harness parses them with the `json` grammar (both language ids share it).
  The `*-jsonc` dirs go through the `jsonc` language id specifically.
- **Refusals** (join guards) render as a single line `// REFUSED: <code>` in the
  `.out.ts`, where `<code>` is `width` or `lineComment`.
- **Toggle idempotency:** a toggle fixture applies the toggle twice (split then
  join, reparsing in between). For canonical inputs `out.ts === in.ts`, so the
  snapshot is a true round-trip assertion. Inputs that cannot round-trip cleanly
  (trailing-comma normalization, a line comment that makes join refuse) snapshot
  whatever the double toggle produces.

Regenerate snapshots after an intentional behavior change:

```sh
npm run test:update      # UPDATE_FIXTURES=1 vitest run
```

## Coverage matrix

Every supported node type has split, join, and toggle coverage, each with at
least one positive case and one tricky case (comment / nested / edge size), plus
both refusal codes on join.

| Node type                  | Split | Join | Toggle | Join refusals      |
| -------------------------- | :---: | :--: | :----: | ------------------ |
| `array`                    |  ✓¹   |  ✓¹  |   ✓    | width, lineComment |
| `object`                   |  ✓¹   |  ✓¹  |   ✓    | width, lineComment |
| `arguments`                |   ✓   |  ✓   |   ✓    | width, lineComment |
| `formal_parameters`        |   ✓   |  ✓   |   ✓    | width, lineComment |
| `array_pattern`            |   ✓   |  ✓   |   ✓    | width, lineComment |
| `object_pattern`           |   ✓   |  ✓   |   ✓    | width, lineComment |
| `named_imports`            |   ✓   |  ✓   |   ✓    | width, lineComment |
| `export_clause`            |   ✓   |  ✓   |   ✓    | width, lineComment |
| `type_arguments`           |   ✓   |  ✓   |   ✓    | width, lineComment |
| `type_parameters`          |   ✓   |  ✓   |   ✓    | width, lineComment |
| `tuple_type`               |   ✓   |  ✓   |   ✓    | width, lineComment |
| `object_type`              |   ✓   |  ✓   |   ✓    | width, lineComment |
| `interface_body`           |   ✓   |  ✓   |   ✓    | width, lineComment |
| `enum_body`                |  ✓³   |  ✓³  |   ✓    | width, lineComment |
| `jsx_opening_element`      |  ✓²   |  ✓²  |   ✓    | width, lineComment |
| `jsx_self_closing_element` |  ✓²   |  ✓²  |   ✓    | width, lineComment |

¹ `array` and `object` share the `split/literals` and `join/literals` dirs.
² JSX attribute lists share the `split/jsx_attributes` and `join/jsx_attributes`
dirs; refusals live in `join/jsx_attributes-refused-*`.
³ `enum_body` covers both `enum` and `const enum` (they parse to the same node).

### PHP (`php` grammar, `*-php` dirs)

| Node type                    | Split | Join | Toggle | Join refusals      |
| ---------------------------- | :---: | :--: | :----: | ------------------ |
| `array_creation_expression`⁴ |   ✓   |  ✓   |   ✓    | width, lineComment |
| `list_literal`⁵              |   ✓   |  ✓   |   ✓    | width, lineComment |
| `arguments`                  |   ✓   |  ✓   |   ✓    | width, lineComment |
| `formal_parameters`          |   ✓   |  ✓   |   ✓    | width, lineComment |
| `namespace_use_group`        |   ✓   |  ✓   |   ✓    | width, lineComment |
| `match_block`                |   ✓   |  ✓   |   ✓    | width, lineComment |

⁴ Covers both the `[…]` and legacy `array(…)` surface forms. The
`*-refused-line-comment` dirs cover both `//` and `#` PHP line comments.
`namespace_use_group` never emits a trailing comma on split (a syntax error
there); the `split-php/trailing-comma-*` and `split-php/array-tabs` dirs cover
the settings on PHP arrays.

⁵ Array destructuring targets — both `[$a, $b] = $c` and legacy
`list($a, $b) = $c`. Unlike `array_creation_expression`, a keyed element exposes
its key and target as two sibling named children around an anonymous `=>`, so
the `keyed` pairs guard that the arrow survives a join; `by-reference` and
`skipped-slot` cover `&$b` targets and empty slots.

### JSON / JSONC (`json` grammar, `*-json` and `*-jsonc` dirs)

| Node type | Split | Join | Toggle | Join refusals      |
| --------- | :---: | :--: | :----: | ------------------ |
| `array`   |   ✓   |  ✓   |   ✓    | width, lineComment |
| `object`  |   ✓   |  ✓   |   ✓    | width, lineComment |

Neither type ever emits a trailing separator: one is invalid in strict JSON and
`tree-sitter-json` cannot parse it even in JSONC, so `split-json/trailing-comma-*`
asserts that all three `trailingComma` modes agree on omitting it.
`split-json/object-tabs` and `join-json/bracket-spacing-off` cover the other two
settings. The `*-jsonc` dirs run the `jsonc` language id: a block comment
survives a join, a `//` comment refuses one, and
`split-recursive-json/single-pair-skipped` pins the single-element skip rule.

## Directory layout

```
split/<node_type>/              # force-split per node type
split/literals/                 # array + object
split/literals-tabs/            # tab-indented variants
split/trailing-comma-{add,never,preserve}/   # T-14 trailingComma setting
join/<node_type>/               # force-join per node type
join/<node_type>-refused-width/         # width-guard refusals
join/<node_type>-refused-line-comment/  # line-comment-guard refusals
join/bracket-spacing-{on,off}/  # T-14 bracketSpacing setting
join/max-join-length/           # T-14 maxJoinLength setting
toggle/<node_type>/             # T-15 round-trip idempotency (TS)
toggle-tsx/jsx_*/               # T-15 round-trip idempotency (TSX)
split-recursive/  join-recursive/        # T-13 recursive variants (TS)
split-recursive-tsx/  join-recursive-tsx/   # T-13 recursive variants (TSX)
split-php/<node_type>/          # PHP force-split per node type
split-php/array-tabs/           # PHP tab-indented split
split-php/trailing-comma-{add,never,preserve}/   # PHP trailingComma on arrays
join-php/<node_type>/           # PHP force-join per node type
join-php/<node_type>-refused-{width,line-comment}/   # PHP join refusals
toggle-php/<node_type>/         # PHP round-trip idempotency
split-recursive-php/  join-recursive-php/   # PHP recursive variants
split-json/<node_type>/         # JSON force-split per node type
split-json/object-tabs/         # JSON tab-indented split
split-json/trailing-comma-{add,never,preserve}/   # all three omit the separator
join-json/<node_type>/          # JSON force-join per node type
join-json/<node_type>-refused-{width,line-comment}/  # JSON join refusals
join-json/bracket-spacing-off/  # JSON bracketSpacing setting
toggle-json/<node_type>/        # JSON round-trip idempotency
split-recursive-json/  join-recursive-json/  # JSON recursive variants
split-jsonc/  join-jsonc/  toggle-jsonc/    # the `jsonc` language id + comments
sample/                         # no-op fixture proving the harness
```

## Refusal codes

| Code          | Meaning                                                        |
| ------------- | ------------------------------------------------------------- |
| `width`       | Joined line would exceed the effective `maxJoinLength`.       |
| `lineComment` | Node contains a line comment (`//`, or `#` in PHP) joining would swallow. |
