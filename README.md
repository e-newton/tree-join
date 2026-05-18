# Tree Join

Toggle, split, and join TypeScript/JavaScript constructs using tree-sitter.

**Status:** early scaffolding. No user-facing functionality yet — see `TICKETS.md` for the planned work.

## Development

```sh
npm install        # also installs the pre-commit hook via simple-git-hooks
npm run typecheck
npm run lint       # eslint . (use `npm run lint:fix` to auto-fix)
npm run format     # prettier --write . (use `format:check` for read-only)
npm test
npm run build
```

CI runs `typecheck`, `lint`, `format:check`, `build`, and `test` on every push and PR.
