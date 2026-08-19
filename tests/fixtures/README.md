# Fixture corpus

Snapshot fixtures that exercise the split / join / toggle transforms end-to-end
on real tree-sitter parses. There are **369** `*.in.ts` ↔ `*.out.ts` pairs (300
TS/JS/TSX + 69 PHP), driven by `tests/unit/runFixtures.test.ts` via the
`runFixtures` helper in `tests/runFixtures.ts`.

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
| `jsx_opening_element`      |  ✓²   |  ✓²  |   ✓    | width, lineComment |
| `jsx_self_closing_element` |  ✓²   |  ✓²  |   ✓    | width, lineComment |

¹ `array` and `object` share the `split/literals` and `join/literals` dirs.
² JSX attribute lists share the `split/jsx_attributes` and `join/jsx_attributes`
dirs; refusals live in `join/jsx_attributes-refused-*`.

### PHP (`php` grammar, `*-php` dirs)

| Node type                    | Split | Join | Toggle | Join refusals      |
| ---------------------------- | :---: | :--: | :----: | ------------------ |
| `array_creation_expression`³ |   ✓   |  ✓   |   ✓    | width, lineComment |
| `list_literal`⁴              |   ✓   |  ✓   |   ✓    | width, lineComment |
| `arguments`                  |   ✓   |  ✓   |   ✓    | width, lineComment |
| `formal_parameters`          |   ✓   |  ✓   |   ✓    | width, lineComment |
| `namespace_use_group`        |   ✓   |  ✓   |   ✓    | width, lineComment |
| `match_block`                |   ✓   |  ✓   |   ✓    | width, lineComment |

³ Covers both the `[…]` and legacy `array(…)` surface forms. The
`*-refused-line-comment` dirs cover both `//` and `#` PHP line comments.
`namespace_use_group` never emits a trailing comma on split (a syntax error
there); the `split-php/trailing-comma-*` and `split-php/array-tabs` dirs cover
the settings on PHP arrays.

⁴ Array destructuring targets — both `[$a, $b] = $c` and legacy
`list($a, $b) = $c`. Unlike `array_creation_expression`, a keyed element exposes
its key and target as two sibling named children around an anonymous `=>`, so
the `keyed` pairs guard that the arrow survives a join; `by-reference` and
`skipped-slot` cover `&$b` targets and empty slots.

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
sample/                         # no-op fixture proving the harness
```

## Refusal codes

| Code          | Meaning                                                        |
| ------------- | ------------------------------------------------------------- |
| `width`       | Joined line would exceed the effective `maxJoinLength`.       |
| `lineComment` | Node contains a line comment (`//`, or `#` in PHP) joining would swallow. |
