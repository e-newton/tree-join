#!/usr/bin/env node
// Dump the tree-sitter AST for a TS/TSX/JS/JSX source.
//
// Usage:
//   node scripts/dump-ast.mjs [options] <file>
//   node scripts/dump-ast.mjs [options] --source '<code>'
//
// Options:
//   --lang <id>       Language id: typescript | typescriptreact | javascript | javascriptreact.
//                     Default: inferred from file extension; falls back to 'typescript'.
//   --source <code>   Parse the given source string instead of a file.
//   --named-only      Skip anonymous nodes (the same children findFirstSupported walks).
//   --max-depth <n>   Limit walker depth (default: unlimited).
//   --no-sexpr        Skip the S-expression dump (only show the walker output).
//   --no-text         Skip per-node text snippets in the walker output.

import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Language, Parser } from 'web-tree-sitter';

const LANGUAGE_ID_TO_GRAMMAR = {
  typescript: 'typescript',
  javascript: 'typescript',
  typescriptreact: 'tsx',
  javascriptreact: 'tsx',
};

const GRAMMAR_FILE = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
};

const EXT_TO_LANG = {
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascriptreact',
};

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const wasmDir = join(repoRoot, 'wasm');

function parseArgs(argv) {
  const opts = {
    file: undefined,
    source: undefined,
    lang: undefined,
    namedOnly: false,
    maxDepth: Infinity,
    showSexpr: true,
    showText: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lang') opts.lang = argv[++i];
    else if (a === '--source') opts.source = argv[++i];
    else if (a === '--named-only') opts.namedOnly = true;
    else if (a === '--max-depth') opts.maxDepth = Number(argv[++i]);
    else if (a === '--no-sexpr') opts.showSexpr = false;
    else if (a === '--no-text') opts.showText = false;
    else if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
    } else if (a.startsWith('--')) {
      throw new Error(`Unknown option: ${a}`);
    } else if (opts.file === undefined) {
      opts.file = a;
    } else {
      throw new Error(`Unexpected positional argument: ${a}`);
    }
  }
  return opts;
}

function printHelp() {
  const lines = readFileSync(fileURLToPath(import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.startsWith('//'))
    .map((l) => l.replace(/^\/\/ ?/, ''));
  console.log(lines.join('\n'));
}

async function loadWasm(filename) {
  return readFileSync(join(wasmDir, filename));
}

async function getTree(source, languageId) {
  const grammarKey = LANGUAGE_ID_TO_GRAMMAR[languageId];
  if (!grammarKey) throw new Error(`Unsupported language: ${languageId}`);
  const runtimeBytes = await loadWasm('tree-sitter.wasm');
  await Parser.init({ wasmBinary: runtimeBytes });
  const grammarBytes = await loadWasm(GRAMMAR_FILE[grammarKey]);
  const language = await Language.load(grammarBytes);
  const parser = new Parser();
  parser.setLanguage(language);
  const tree = parser.parse(source);
  if (!tree) throw new Error('Parse failed');
  return tree;
}

function formatPosition(point) {
  return `${point.row}:${point.column}`;
}

function previewText(node) {
  const raw = node.text;
  const oneLine = raw.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 60) return oneLine;
  return oneLine.slice(0, 57) + '...';
}

function walk(node, depth, opts) {
  if (depth > opts.maxDepth) return;
  const indent = '  '.repeat(depth);
  const namedFlag = node.isNamed ? '' : ' (anon)';
  const range = `${formatPosition(node.startPosition)}-${formatPosition(node.endPosition)}`;
  const textPart = opts.showText ? ` : ${JSON.stringify(previewText(node))}` : '';
  console.log(`${indent}${node.type}${namedFlag} @ ${range}${textPart}`);

  const children = opts.namedOnly ? node.namedChildren : node.children;
  for (const child of children) {
    if (!child) continue;
    walk(child, depth + 1, opts);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  let source;
  if (opts.source !== undefined) {
    source = opts.source;
    if (!opts.lang) opts.lang = 'typescript';
  } else if (opts.file) {
    source = readFileSync(opts.file, 'utf8');
    if (!opts.lang) opts.lang = EXT_TO_LANG[extname(opts.file)] ?? 'typescript';
  } else {
    printHelp();
    process.exit(1);
  }

  const tree = await getTree(source, opts.lang);
  console.log(`# language: ${opts.lang}`);
  console.log(`# source: ${opts.file ?? '<inline>'}`);
  console.log();

  if (opts.showSexpr) {
    console.log('## S-expression');
    console.log(tree.rootNode.toString());
    console.log();
  }

  console.log('## Walker');
  walk(tree.rootNode, 0, opts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
