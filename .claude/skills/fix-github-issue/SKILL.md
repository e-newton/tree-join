---
name: fix-github-issue
description: Take a GitHub issue from report to merged PR — branch in a throwaway git worktree, explore/implement/test, open a PR onto main, watch CI until every check passes, merge, and delete the worktree. Use whenever the user points at an issue (number, URL, or "fix issue N") and wants it fixed, not just diagnosed.
---

# Fix a GitHub issue end to end

Five phases. Do them in order, and do not skip the cleanup.

## 0. Read the issue

```sh
gh issue view <n> --json number,title,body,labels,state
```

Issues in this repo are usually written with the offending file and line, a
verified reproduction, and a suggested fix — treat all three as claims to
confirm in the code, not as instructions to apply blindly. Read the cited
source before writing anything. If the issue's diagnosis is wrong, say so and
fix the real cause.

## 1. Branch in a temp worktree

Never work on the primary checkout — it may have unrelated changes, and a
worktree keeps the branch isolated.

```sh
git fetch origin
git worktree add -b <branch> "$SCRATCHPAD/wt-<issue>" origin/main
```

Branch from `origin/main`, not from whatever the primary checkout has checked
out. Name the branch for the work: `fix-<issue#>-<slug>`.

The worktree has no `node_modules` and no `dist/`. Get one before running
anything:

```sh
cd "$SCRATCHPAD/wt-<issue>"
ln -s <primary-checkout>/node_modules node_modules   # fast; deps unchanged
# or, if package.json/package-lock.json changed:
npm ci
```

## 2. Explore, implement, test

Read `CLAUDE.md` first — it maps the architecture and names the commands.
Match the surrounding code; keep the change as small as the bug allows.

Every fix needs a test that fails before it and passes after. For transform
behaviour that means a fixture pair under `tests/fixtures/` (`*.in.ts` ↔
`*.out.ts`, plus an `*.opts.json` when the case depends on a setting) — add
the pair, run `npm run test:update`, and read the generated `.out.ts` to
confirm it is the output you actually want. Bump the pair counts in
`tests/fixtures/README.md`. Logic that is not transform output goes in a unit
test under `tests/unit/`.

Add a `## [Unreleased]` entry to `CHANGELOG.md` under the right Keep-a-Changelog
heading (`Fixed`, `Added`, …), written for a user of the extension.

Run the same gate CI runs, before pushing:

```sh
npm run typecheck && npm run lint && npm run format:check && npm run build && npm test
```

`npm run lint:fix` and `npm run format` fix the mechanical failures.
`npm run test:integration` and `npm run test:web` also run in CI but need a
display / browser download; leave them to CI unless the change touches the
extension host or the web bundle.

## 3. Open the PR

```sh
git add -A
git commit   # conventional prefix: fix:, feat:, ci:, build:, docs:
git push -u origin <branch>
gh pr create --base main --title "..." --body "..."
```

The PR body states the bug, the root cause, the fix, and the test that covers
it, and closes the issue (`Closes #<n>`). Keep one concern per PR — do not
smuggle in unrelated cleanups.

## 4. Watch CI, then merge

CI (`.github/workflows/ci.yml`) runs three jobs — `build-test`, `integration`,
`web`. All three must pass. Watch them:

```sh
gh pr checks <n> --watch
```

If a check fails, read the failing job's log (`gh run view <run-id> --log-failed`),
fix the cause in the worktree, push, and watch again. Do not merge on a partial
green, and do not merge a run that was cancelled or skipped.

Once every check passes:

```sh
gh pr merge <n> --merge --delete-branch
```

This repo uses merge commits (`Merge pull request #N from …`), so `--merge`,
not `--squash`.

## 5. Clean up

```sh
cd <primary-checkout>
git worktree remove "$SCRATCHPAD/wt-<issue>"
git worktree prune
```

Confirm with `git worktree list` that nothing is left behind, and verify the
issue closed (`gh issue view <n> --json state`) — the `Closes #<n>` line does
that automatically on merge.

## Reporting back

Say what the root cause was, what the fix changed, which test covers it, that
CI went green, and that the PR is merged and the worktree removed. If any part
did not happen — a check you could not get green, a cleanup you skipped — say
that plainly instead of implying a clean run.
