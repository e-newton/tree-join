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

// Both bundles load the same emscripten glue. The Node build uses it as-is; the
// web build runs it under `platform: 'browser'`, where the glue's runtime
// ENVIRONMENT_IS_* checks pick the browser code paths. We feed `wasmBinary`
// straight to `Parser.init`, so the file-system loading path (the only place
// that touches `__dirname`) is never executed — but the bare `__dirname`
// reference still has to resolve to *something* under a browser target, hence
// the define below. See src/parser.ts.
const webTreeSitterCjs = join(repoRoot, 'node_modules', 'web-tree-sitter', 'tree-sitter.cjs');

export function copyWasm() {
  rmSync(distWasmDir, { recursive: true, force: true });
  mkdirSync(distWasmDir, { recursive: true });
  const wasmFiles = ['tree-sitter.wasm', 'tree-sitter-typescript.wasm', 'tree-sitter-tsx.wasm'];
  for (const name of wasmFiles) {
    cpSync(join(vendoredWasmDir, name), join(distWasmDir, name));
  }
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

// The emscripten glue `require("fs")`, `require("path")`, and dynamically
// `import("fs/promises")` inside ENVIRONMENT_IS_NODE-guarded blocks. Those blocks
// never run under a browser target, but esbuild still has to resolve the
// specifiers at bundle time. Stub them to empty modules so the web bundle builds;
// the stubbed values are referenced only on code paths the browser never takes.
const NODE_STUBS = new Set(['fs', 'path', 'fs/promises', 'node:fs', 'node:path']);
const nodeStubsPlugin = {
  name: 'node-stubs',
  setup(build) {
    const filter = /^(node:)?(fs|path)(\/promises)?$/;
    build.onResolve({ filter }, (resolveArgs) =>
      NODE_STUBS.has(resolveArgs.path)
        ? { path: resolveArgs.path, namespace: 'node-stub' }
        : undefined,
    );
    build.onLoad({ filter: /.*/, namespace: 'node-stub' }, () => ({
      contents: 'module.exports = {};',
      loader: 'js',
    }));
  },
};

function watchLogPlugin(label) {
  return {
    name: 'watch-log',
    setup(build) {
      build.onStart(() => console.log(`[watch] ${label} build started`));
      build.onEnd((result) => {
        const errors = result.errors.length;
        if (errors > 0) {
          console.log(`[watch] ${label} build failed with ${errors} error(s)`);
        } else {
          console.log(`[watch] ${label} build finished`);
        }
      });
    },
  };
}

// Shared between both targets. `bundleOverrides` lets the caller (e.g. the
// web-bundle audit test) tweak options like `write` without duplicating these.
const baseConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  external: ['vscode'],
  alias: {
    'web-tree-sitter': webTreeSitterCjs,
  },
  sourcemap: isProd ? false : 'inline',
  // Ship readable production code. The VS Marketplace security scanner flags
  // minified/obfuscated JS as "suspicious content", so we never minify the
  // published bundle — the size cost is negligible next to the WASM grammars,
  // and an open-source extension benefits from a legible shipped bundle.
  minify: false,
  logLevel: 'info',
};

/** Node extension host bundle (`main` in package.json). */
export const nodeConfig = {
  ...baseConfig,
  outfile: 'dist/extension.js',
  platform: 'node',
  target: 'node18',
};

/** Web extension host bundle (`browser` in package.json) for vscode.dev/github.dev. */
export const webConfig = {
  ...baseConfig,
  outfile: 'dist/extension.web.js',
  platform: 'browser',
  // Neutralize the emscripten glue's lone `__dirname` reference (guarded by
  // ENVIRONMENT_IS_NODE at runtime, but must still resolve under a browser
  // target). `global` is aliased to `globalThis` for any stray references.
  define: {
    __dirname: '""',
    __filename: '""',
    global: 'globalThis',
  },
  plugins: [nodeStubsPlugin],
};

// Run the builds only when invoked as a CLI (`node esbuild.config.mjs`), so this
// module can be imported by tests purely to reuse the configs above.
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  const targets = [
    { config: nodeConfig, label: 'node' },
    { config: webConfig, label: 'web' },
  ];

  if (isWatch) {
    for (const { config, label } of targets) {
      const ctx = await esbuild.context({
        ...config,
        plugins: [...(config.plugins ?? []), copyWasmPlugin, watchLogPlugin(label)],
      });
      await ctx.watch();
    }
    console.log('[watch] watching for changes…');
  } else {
    // copyWasm via the plugin on each build; both write the same dist/wasm.
    for (const { config } of targets) {
      await esbuild.build({ ...config, plugins: [...(config.plugins ?? []), copyWasmPlugin] });
    }
  }
}
