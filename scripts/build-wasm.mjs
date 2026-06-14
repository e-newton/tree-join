#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const TREE_SITTER_CLI_VERSION = '0.25.0';

// Vendored grammar sources. Each entry is a pinned grammar repo plus the
// subdirectories within it to build. Adding a language means adding an entry
// here (and a descriptor table in src/nodeTypes.ts). The built `.wasm` files are
// committed under wasm/ and copied into dist/wasm/ by the esbuild copy plugin;
// this script only needs to run when bumping or adding a grammar.
const GRAMMAR_SOURCES = [
  {
    repo: 'https://github.com/tree-sitter/tree-sitter-typescript.git',
    tag: 'v0.23.2',
    // subdir within the repo -> output name (`tree-sitter-<name>.wasm`)
    grammars: [
      { subdir: 'typescript', name: 'typescript' },
      { subdir: 'tsx', name: 'tsx' },
    ],
  },
  {
    repo: 'https://github.com/tree-sitter/tree-sitter-php.git',
    tag: 'v0.23.12',
    // The `php` grammar parses full PHP files (including the `<?php` tag and
    // interleaved text); `php_only` is the text-free variant we don't use.
    grammars: [{ subdir: 'php', name: 'php' }],
  },
];

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const wasmDir = join(repoRoot, 'wasm');
mkdirSync(wasmDir, { recursive: true });

function sh(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

console.log(`Pinning tree-sitter-cli ${TREE_SITTER_CLI_VERSION}`);
console.log(
  'WASM build requires either emcc on PATH or a running Docker daemon ' +
    '(tree-sitter CLI falls back to docker.io/emscripten/emsdk automatically).',
);

for (const source of GRAMMAR_SOURCES) {
  const work = mkdtempSync(join(tmpdir(), 'tree-join-wasm-'));
  console.log(`\nWorking dir: ${work}`);
  console.log(`Pinning ${source.repo} ${source.tag}`);
  try {
    const srcDir = join(work, 'src');
    sh('git', ['clone', '--depth', '1', '--branch', source.tag, source.repo, srcDir]);

    for (const { subdir, name } of source.grammars) {
      const langDir = join(srcDir, subdir);
      if (!existsSync(langDir)) {
        throw new Error(`expected grammar subdir ${langDir} not found in cloned repo`);
      }
      const out = join(wasmDir, `tree-sitter-${name}.wasm`);
      console.log(`\nBuilding ${name} grammar -> ${out}`);
      sh('npx', [
        '--yes',
        `tree-sitter-cli@${TREE_SITTER_CLI_VERSION}`,
        'build',
        '--wasm',
        '--output',
        out,
        langDir,
      ]);
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

console.log('\nDone. wasm/ contents:');
for (const f of readdirSync(wasmDir).sort()) console.log(`  ${f}`);
