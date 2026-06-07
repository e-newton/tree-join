import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import esbuild from 'esbuild';

// Integration tests run inside the VSCode extension host, which loads plain
// CommonJS via Node's require. The main tsconfig is noEmit/ESM, so bundle the
// test sources separately to out-test/ (kept out of the shipped dist/ VSIX).
const integrationDir = 'tests/integration';
const entryPoints = readdirSync(integrationDir, { recursive: true })
  .filter((name) => typeof name === 'string' && name.endsWith('.test.ts'))
  .map((name) => join(integrationDir, name));

await esbuild.build({
  entryPoints,
  outdir: 'out-test',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  // `vscode` is injected by the test host; mocha globals come from the runner.
  external: ['vscode', 'mocha'],
  sourcemap: 'inline',
  logLevel: 'info',
});
