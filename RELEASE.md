# Releasing tree-join

This file is the manual runbook for things Claude can't do for you: registering
publisher accounts, creating tokens, recording the demo GIF, and pushing the
button on the first publish. The repo, CI, and packaging are already wired — you
just need to do the steps below **once** (accounts/tokens/icon/GIF), then the
per-release steps each time you ship.

Everything here is done from this branch (or main after merge). Check each box as
you go.

---

## One-time setup

### 1. Register the Marketplace publisher

- [ ] Sign in at <https://marketplace.visualstudio.com/manage> with the Microsoft
      account you want to own the extension.
- [ ] Create a publisher with **ID `ericnewton`** (must match `publisher` in
      `package.json` — the final extension id is `ericnewton.tree-join`).

### 2. Create the Azure DevOps Personal Access Token (for `vsce`)

- [ ] Go to <https://dev.azure.com> → User settings → **Personal access tokens**.
- [ ] New token, **Organization: All accessible organizations**.
- [ ] Scope: **Marketplace → Manage**. Set a long expiry.
- [ ] Copy the token — you'll paste it as the `VSCE_PAT` secret below.

### 3. Register the Open VSX namespace + token (for `ovsx`)

- [ ] Sign in at <https://open-vsx.org> with GitHub.
- [ ] Accept the Eclipse Foundation Publisher Agreement (required, one-time):
      <https://open-vsx.org/user-settings/extensions>.
- [ ] Create an **access token** under user settings → copy it for `OVSX_PAT`.
- [ ] Create the namespace `ericnewton` (replace the token):

```sh
npx ovsx create-namespace ericnewton -p <your-OVSX_PAT>
```

### 4. Add the tokens as GitHub Actions secrets

In the repo: **Settings → Secrets and variables → Actions → New repository secret**.

- [ ] `VSCE_PAT` = the Azure DevOps token from step 2.
- [ ] `OVSX_PAT` = the Open VSX token from step 3.

The `Release` workflow (`.github/workflows/release.yml`) reads exactly these two
names — no other configuration needed.

### 5. Replace the placeholder icon (optional but recommended)

`images/icon.png` is a generated 128×128 placeholder (teal brackets on slate).
Swap in a real design before the first publish if you want.

- [ ] Drop a final 128×128 PNG at `images/icon.png`.
- The packaging test (`tests/unit/packaging.test.ts`) enforces 128×128, so any
  replacement must keep those dimensions.
- To regenerate the placeholder instead: `npm run build:icon`.

### 6. Record the demo GIF

The README links `images/toggle.gif`. **It must exist before the first publish**
or the Marketplace page shows a broken image.

- [ ] Record a short screen capture of `tree-join.toggle` flipping an array (or
      object) between single-line and multi-line.
- [ ] Save it as `images/toggle.gif`. Keep it small (a few hundred KB; trim to a
      couple seconds, ~600–800px wide).
- [ ] Commit it.

---

## Per-release steps (v1.0.0 and onward)

> All quality gates (typecheck, lint, format, unit/fixture, integration, web)
> run automatically — the `Release` workflow re-runs the **full CI gate** before
> it publishes, and refuses to publish unless HEAD is on a tag matching
> `package.json`'s version.

1. [ ] Confirm `package.json` `version` is the version you intend to ship
       (currently `1.0.0`) and `CHANGELOG.md` has a matching `## [<version>]`
       entry dated today.
2. [ ] Make sure `images/toggle.gif` exists (step 6) so the published README
       renders.
3. [ ] Merge this work to `main` and pull it locally.
4. [ ] Tag the release commit and push the tag:
   ```sh
   git tag v1.0.0
   git push origin v1.0.0
   ```
5. [ ] Run the publish workflow:
   - GitHub → **Actions → Release → Run workflow**.
   - In the **"Use workflow from"** ref dropdown, **select the `v1.0.0`
     tag** (not a branch). The tag-guard step fails the run if you pick a
     ref whose tag doesn't equal `package.json`'s version.
6. [ ] Watch the run. It packages one `.vsix` and publishes it to **both** the
       VSCode Marketplace and Open VSX.

### Verify the published extension

- [ ] Marketplace listing live: <https://marketplace.visualstudio.com/items?itemName=ericnewton.tree-join>
- [ ] Open VSX listing live: <https://open-vsx.org/extension/ericnewton/tree-join>
- [ ] On a clean VSCode, install `ericnewton.tree-join`, open a `.ts` file, and
      run **Tree Join: Toggle** on `[1, 2, 3]` to confirm a real install works.

### If you ever need to publish from your laptop instead of CI

```sh
npm run build
npx vsce publish -p <VSCE_PAT>
npx ovsx publish -p <OVSX_PAT>
```

---

## Subsequent releases

Bump `package.json` `version`, add a new `CHANGELOG.md` entry, merge, then repeat
the **Per-release steps** with the new `vX.Y.Z` tag. Accounts, tokens, and
secrets from the one-time setup carry over.
