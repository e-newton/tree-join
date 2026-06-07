import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Integration tests run in the VSCode extension host via @vscode/test-cli,
    // not vitest (they import `vscode` and use mocha globals).
    exclude: ['tests/integration/**', 'node_modules/**'],
  },
});
