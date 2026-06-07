import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out-test/**/*.test.js',
  version: 'stable',
  // Downloading/launching VSCode and loading WASM is slow on cold CI runners.
  mocha: {
    ui: 'tdd',
    timeout: 60000,
  },
});
