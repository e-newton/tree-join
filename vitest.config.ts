import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Integration and web-smoke tests run in a VSCode extension host (Electron
    // via @vscode/test-cli; browser via @vscode/test-web), not vitest — they
    // import `vscode` and use mocha globals.
    exclude: ['tests/integration/**', 'tests/web/**', 'node_modules/**'],
  },
});
