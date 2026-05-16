#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const GRAMMAR_VERSION = 'v0.23.2';
const TREE_SITTER_CLI_VERSION = '0.25.0';
const REPO_URL = 'https://github.com/tree-sitter/tree-sitter-typescript.git';
const GRAMMARS = ['typescript', 'tsx'];

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const wasmDir = join(repoRoot, 'wasm');
mkdirSync(wasmDir, { recursive: true });

function sh(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', ...opts });
}

const work = mkdtempSync(join(tmpdir(), 'tree-join-wasm-'));
console.log(`Working dir: ${work}`);
console.log(`Pinning tree-sitter-typescript ${GRAMMAR_VERSION}`);
console.log(`Pinning tree-sitter-cli ${TREE_SITTER_CLI_VERSION}`);
console.log(
  'WASM build requires either emcc on PATH or a running Docker daemon ' +
    '(tree-sitter CLI falls back to docker.io/emscripten/emsdk automatically).',
);

try {
  const srcDir = join(work, 'src');
  sh('git', ['clone', '--depth', '1', '--branch', GRAMMAR_VERSION, REPO_URL, srcDir]);

  for (const lang of GRAMMARS) {
    const langDir = join(srcDir, lang);
    if (!existsSync(langDir)) {
      throw new Error(`expected grammar subdir ${langDir} not found in cloned repo`);
    }
    const out = join(wasmDir, `tree-sitter-${lang}.wasm`);
    console.log(`\nBuilding ${lang} grammar -> ${out}`);
    sh(
      'npx',
      [
        '--yes',
        `tree-sitter-cli@${TREE_SITTER_CLI_VERSION}`,
        'build',
        '--wasm',
        '--output',
        out,
        langDir,
      ],
    );
  }

  console.log('\nDone. wasm/ contents:');
  for (const f of readdirSync(wasmDir).sort()) console.log(`  ${f}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
