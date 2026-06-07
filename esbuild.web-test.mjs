import esbuild from 'esbuild';

// The web smoke suite runs inside the browser-based extension host that
// @vscode/test-web spins up. That host loads a single browser bundle exporting
// `run()` (see tests/web/index.ts), so we bundle the mocha runner + the test
// sources together for a browser target. Kept out of the shipped VSIX via
// .vscodeignore (out-test-web/**).
await esbuild.build({
  entryPoints: ['tests/web/index.ts'],
  outfile: 'out-test-web/index.js',
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  // `vscode` is injected by the web extension host; everything else (including
  // mocha) is bundled so it loads in the browser worker.
  external: ['vscode'],
  define: {
    // mocha's browser build references `global`; map it to the worker global.
    global: 'globalThis',
  },
  sourcemap: 'inline',
  logLevel: 'info',
});
