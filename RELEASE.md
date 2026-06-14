# Releasing

Releases are cut by the manual-dispatch [`Release`](.github/workflows/release.yml)
workflow. It runs the full CI gate (build + unit/fixture tests + Electron and web
smoke), packages a single `.vsix`, and publishes that identical artifact to the
registries you select. It refuses to publish unless the checked-out commit
carries a tag exactly equal to `v<package.json version>`.

## Registry status

| Registry           | Command        | Status                                                                                                                       |
| ------------------ | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Open VSX**       | `ovsx publish` | **Active.** Publish here. Used by VSCodium, Gitpod, Cursor, etc.                                                             |
| VSCode Marketplace | `vsce publish` | Blocked at the account level (publisher flagged "suspicious content"). Do not dispatch `marketplace` until that is resolved. |

So for now: **dispatch the workflow with `registries: openvsx`.**

## Prerequisites (one-time)

- Repo secret **`OVSX_PAT`** — an Open VSX access token (configured).
- The Open VSX **`EricNewton` namespace** must exist and the Eclipse Foundation
  Publisher Agreement must be signed for that account, or `ovsx publish` 403s.
- `VSCE_PAT` is also configured but unused while the Marketplace is blocked.

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
   - **registries:** `openvsx`.
     Or from the CLI: `gh workflow run release.yml --ref vX.Y.Z -f registries=openvsx`.
4. The job verifies `HEAD` is on `vX.Y.Z`, runs CI, packages the `.vsix`, and
   publishes to Open VSX.
5. Verify at `https://open-vsx.org/extension/EricNewton/tree-join` (the new
   version should appear within a minute or two).

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
