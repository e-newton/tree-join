# Releasing

Releases are cut by the manual-dispatch [`Release`](.github/workflows/release.yml)
workflow. It runs the full CI gate (build + unit/fixture tests + Electron and web
smoke), packages a single `.vsix`, and publishes that identical artifact to the
registries you select. It refuses to publish unless the checked-out commit
carries a tag exactly equal to `v<package.json version>`.

## Registry status

| Registry               | Command        | Status                                                                                                                   |
| ---------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **VSCode Marketplace** | `vsce publish` | **Active** as of v1.1.1. The earlier account-level "suspicious content" block on the `EricNewton` publisher is resolved. |
| **Open VSX**           | `ovsx publish` | **Active.** Used by VSCodium, Gitpod, Cursor, etc.                                                                       |

Both registries are live, so **dispatch the workflow with `registries: both`** and
keep the two in step. The `marketplace` / `openvsx` choices remain for re-running a
single registry when one of them fails a dispatch.

## Prerequisites (one-time)

- Repo secrets **`VSCE_PAT`** (Marketplace) and **`OVSX_PAT`** (Open VSX) — both
  configured. A PAT that has expired is the usual cause of a publish step failing.
- The Open VSX **`EricNewton` namespace** must exist and the Eclipse Foundation
  Publisher Agreement must be signed for that account, or `ovsx publish` 403s.

## Cutting a release (`vX.Y.Z`)

1. Land the release commit on `main` with:
   - `package.json` `version` = `X.Y.Z`, and
   - a `CHANGELOG.md` `## [X.Y.Z]` entry with a matching link reference.
2. Tag the merged commit and push the tag:
   ```sh
   git checkout main && git pull
   git tag vX.Y.Z
   git push origin vX.Y.Z
   ```
3. **Actions → Release → Run workflow**, then set:
   - **Use workflow from:** the `vX.Y.Z` tag (not a branch), and
   - **registries:** `both`.
     Or from the CLI: `gh workflow run release.yml --ref vX.Y.Z -f registries=both`.
4. The job verifies `HEAD` is on `vX.Y.Z`, runs CI, packages the `.vsix`, and
   publishes it to the selected registries.
5. Verify both listings show the new version:
   - `https://marketplace.visualstudio.com/items?itemName=EricNewton.tree-join`
     (Marketplace runs a validation scan, so it can take a few minutes and the
     version appears as "verifying" until it passes)
   - `https://open-vsx.org/extension/EricNewton/tree-join` (usually within a
     minute or two)

## Local sanity check

```sh
npm run package   # produces tree-join-X.Y.Z.vsix locally (no publish)
```

## Notes

- The grammar `.wasm` files are committed under `wasm/` and copied into
  `dist/wasm/` by the build; `vsce package` ships `dist/`. When a grammar is
  bumped, regenerate the committed `.wasm` with `npm run build:wasm` (needs emcc
  or Docker) **before** tagging so the published binary matches the pinned
  source in `scripts/build-wasm.mjs`.
