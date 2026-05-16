import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const args = new Set(process.argv.slice(2));
const isProd = args.has('--prod');
const isWatch = args.has('--watch');

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const distWasmDir = join(repoRoot, 'dist', 'wasm');
const vendoredWasmDir = join(repoRoot, 'wasm');
const runtimeWasm = join(
  repoRoot,
  'node_modules',
  'web-tree-sitter',
  'tree-sitter.wasm',
);

function copyWasm() {
  rmSync(distWasmDir, { recursive: true, force: true });
  mkdirSync(distWasmDir, { recursive: true });
  for (const name of ['tree-sitter-typescript.wasm', 'tree-sitter-tsx.wasm']) {
    cpSync(join(vendoredWasmDir, name), join(distWasmDir, name));
  }
  cpSync(runtimeWasm, join(distWasmDir, 'tree-sitter.wasm'));
}

const copyWasmPlugin = {
  name: 'copy-wasm',
  setup(build) {
    build.onEnd((result) => {
      if (result.errors.length > 0) return;
      copyWasm();
    });
  },
};

const watchLogPlugin = {
  name: 'watch-log',
  setup(build) {
    build.onStart(() => console.log('[watch] build started'));
    build.onEnd((result) => {
      const errors = result.errors.length;
      if (errors > 0) {
        console.log(`[watch] build failed with ${errors} error(s)`);
      } else {
        console.log('[watch] build finished');
      }
    });
  },
};

const config = {
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.js',
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['vscode'],
  alias: {
    'web-tree-sitter': join(
      repoRoot,
      'node_modules',
      'web-tree-sitter',
      'tree-sitter.cjs',
    ),
  },
  sourcemap: isProd ? false : 'inline',
  minify: isProd,
  logLevel: 'info',
  plugins: [copyWasmPlugin, ...(isWatch ? [watchLogPlugin] : [])],
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('[watch] watching for changes…');
} else {
  await esbuild.build(config);
}
