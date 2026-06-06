import { readFileSync } from 'node:fs';
import { Language, Parser } from 'web-tree-sitter';
import {
  GRAMMAR_FILE,
  GrammarKey,
  LANGUAGE_ID_TO_GRAMMAR,
  parseSource,
  SyntaxNode,
  Tree,
} from '../../src/parseSource';
import { splitNode, SplitOptions } from '../../src/split';
import { joinNode, JoinOptions } from '../../src/join';
import { joinRecursive, Reparse, splitRecursive } from '../../src/recursive';
import { runFixtures } from '../runFixtures';
import { join } from 'node:path';
import { isSupported } from '../../src/nodeTypes';

async function getTree(source: string, languageId: string): Promise<Tree> {
  return await parseSource(source, languageId, async (filename: string) => {
    return readFileSync(join(__dirname, '../../wasm', filename));
  });
}

function readWasm(filename: string): Uint8Array {
  return readFileSync(join(__dirname, '../../wasm', filename));
}

// A cached synchronous parser per grammar — the recursive transforms re-parse a
// working string many times, so they need a sync parse() rather than the
// wasm-reloading parseSource() helper.
let runtime: Promise<void> | undefined;
const parserCache = new Map<GrammarKey, Promise<Parser>>();

async function loadParser(languageId: string): Promise<Parser> {
  const grammar = LANGUAGE_ID_TO_GRAMMAR[languageId];
  if (!grammar) throw new Error(`Unsupported Language: ${languageId}`);
  let pending = parserCache.get(grammar);
  if (!pending) {
    pending = (async () => {
      if (!runtime) runtime = Parser.init({ wasmBinary: readWasm('tree-sitter.wasm') });
      await runtime;
      const language = await Language.load(readWasm(GRAMMAR_FILE[grammar]));
      const parser = new Parser();
      parser.setLanguage(language);
      return parser;
    })();
    parserCache.set(grammar, pending);
  }
  return pending;
}

async function reparserFor(languageId: string): Promise<Reparse> {
  const parser = await loadParser(languageId);
  return (text: string) => {
    const tree = parser.parse(text);
    if (!tree) throw new Error('Parse Failed');
    return tree;
  };
}

function findFirstSupported(node: SyntaxNode): SyntaxNode | undefined {
  if (isSupported(node)) return node;
  for (const child of node.namedChildren) {
    if (!child) continue;
    const hit = findFirstSupported(child);
    if (hit) return hit;
  }
  return undefined;
}

const DEFAULT_SPLIT_OPTIONS: SplitOptions = {
  tabSize: 2,
  insertSpaces: true,
};

async function runSplitWith(
  languageId: string,
  input: string,
  opts: Partial<SplitOptions> | undefined,
): Promise<string> {
  const tree = await getTree(input, languageId);
  const node = findFirstSupported(tree.rootNode);

  if (!node) throw Error('Cannot find supported node');

  const resolved: SplitOptions = { ...DEFAULT_SPLIT_OPTIONS, ...(opts ?? {}) };
  const { newText, range } = splitNode(node, input, resolved);
  return input.slice(0, range.startIndex) + newText + input.slice(range.endIndex);
}

const runSplit = (input: string, opts: Partial<SplitOptions> | undefined) =>
  runSplitWith('typescript', input, opts);

const runSplitTsx = (input: string, opts: Partial<SplitOptions> | undefined) =>
  runSplitWith('typescriptreact', input, opts);

const DEFAULT_JOIN_OPTIONS: JoinOptions = {};

async function runJoinWith(
  languageId: string,
  input: string,
  opts: Partial<JoinOptions> | undefined,
): Promise<string> {
  const tree = await getTree(input, languageId);
  const node = findFirstSupported(tree.rootNode);

  if (!node) throw Error('Cannot find supported node');

  const resolved: JoinOptions = { ...DEFAULT_JOIN_OPTIONS, ...(opts ?? {}) };
  const result = joinNode(node, input, resolved);

  if ('refused' in result) {
    return `// REFUSED: ${result.refused}`;
  }

  const { newText, range } = result;
  return input.slice(0, range.startIndex) + newText + input.slice(range.endIndex);
}

const runJoin = (input: string, opts: Partial<JoinOptions> | undefined) =>
  runJoinWith('typescript', input, opts);

const runJoinTsx = (input: string, opts: Partial<JoinOptions> | undefined) =>
  runJoinWith('typescriptreact', input, opts);

runFixtures(new URL('../fixtures/sample', import.meta.url), async (input) => input);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/literals', import.meta.url),
  runSplit,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/literals-tabs', import.meta.url),
  (input, opts) => runSplit(input, { insertSpaces: false, ...(opts ?? {}) }),
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/arguments', import.meta.url),
  runSplit,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/formal_parameters', import.meta.url),
  runSplit,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/array_pattern', import.meta.url),
  runSplit,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/object_pattern', import.meta.url),
  runSplit,
);
runFixtures<Partial<JoinOptions>>(new URL('../fixtures/join/literals', import.meta.url), runJoin);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/literals-refused-line-comment', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/literals-refused-width', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(new URL('../fixtures/join/arguments', import.meta.url), runJoin);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/arguments-refused-line-comment', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/arguments-refused-width', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/formal_parameters', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/formal_parameters-refused-line-comment', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/formal_parameters-refused-width', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/array_pattern', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/array_pattern-refused-line-comment', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/array_pattern-refused-width', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/object_pattern', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/object_pattern-refused-line-comment', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/object_pattern-refused-width', import.meta.url),
  runJoin,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/named_imports', import.meta.url),
  runSplit,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/named_imports', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/named_imports-refused-line-comment', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/named_imports-refused-width', import.meta.url),
  runJoin,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/export_clause', import.meta.url),
  runSplit,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/export_clause', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/export_clause-refused-line-comment', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/export_clause-refused-width', import.meta.url),
  runJoin,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/jsx_attributes', import.meta.url),
  runSplitTsx,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/jsx_attributes', import.meta.url),
  runJoinTsx,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/jsx_attributes-refused-line-comment', import.meta.url),
  runJoinTsx,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/jsx_attributes-refused-width', import.meta.url),
  runJoinTsx,
);

// --- T-12: TypeScript type nodes ---
for (const type of ['type_arguments', 'type_parameters', 'tuple_type', 'object_type']) {
  runFixtures<Partial<SplitOptions>>(
    new URL(`../fixtures/split/${type}`, import.meta.url),
    runSplit,
  );
  runFixtures<Partial<JoinOptions>>(new URL(`../fixtures/join/${type}`, import.meta.url), runJoin);
  runFixtures<Partial<JoinOptions>>(
    new URL(`../fixtures/join/${type}-refused-line-comment`, import.meta.url),
    runJoin,
  );
  runFixtures<Partial<JoinOptions>>(
    new URL(`../fixtures/join/${type}-refused-width`, import.meta.url),
    runJoin,
  );
}

// --- T-14: Settings wiring ---
for (const mode of ['add', 'preserve', 'never']) {
  runFixtures<Partial<SplitOptions>>(
    new URL(`../fixtures/split/trailing-comma-${mode}`, import.meta.url),
    runSplit,
  );
}
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/bracket-spacing-on', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/bracket-spacing-off', import.meta.url),
  runJoin,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join/max-join-length', import.meta.url),
  runJoin,
);

// --- T-13: Recursive variants ---
async function runSplitRecursiveWith(
  languageId: string,
  input: string,
  opts: Partial<SplitOptions> | undefined,
): Promise<string> {
  const reparse = await reparserFor(languageId);
  const node = findFirstSupported(reparse(input).rootNode);
  if (!node) throw Error('Cannot find supported node');

  const resolved: SplitOptions = { ...DEFAULT_SPLIT_OPTIONS, ...(opts ?? {}) };
  const { newText, range } = splitRecursive(node, input, resolved, reparse);
  return input.slice(0, range.startIndex) + newText + input.slice(range.endIndex);
}

async function runJoinRecursiveWith(
  languageId: string,
  input: string,
  opts: Partial<JoinOptions> | undefined,
): Promise<string> {
  const reparse = await reparserFor(languageId);
  const node = findFirstSupported(reparse(input).rootNode);
  if (!node) throw Error('Cannot find supported node');

  const result = joinRecursive(node, input, { ...(opts ?? {}) }, reparse);
  if ('refused' in result) {
    return `// REFUSED: ${result.refused}`;
  }
  const { newText, range } = result;
  return input.slice(0, range.startIndex) + newText + input.slice(range.endIndex);
}

const runSplitRecursive = (input: string, opts: Partial<SplitOptions> | undefined) =>
  runSplitRecursiveWith('typescript', input, opts);
const runSplitRecursiveTsx = (input: string, opts: Partial<SplitOptions> | undefined) =>
  runSplitRecursiveWith('typescriptreact', input, opts);
const runJoinRecursive = (input: string, opts: Partial<JoinOptions> | undefined) =>
  runJoinRecursiveWith('typescript', input, opts);
const runJoinRecursiveTsx = (input: string, opts: Partial<JoinOptions> | undefined) =>
  runJoinRecursiveWith('typescriptreact', input, opts);

runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split-recursive', import.meta.url),
  runSplitRecursive,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split-recursive-tsx', import.meta.url),
  runSplitRecursiveTsx,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join-recursive', import.meta.url),
  runJoinRecursive,
);
runFixtures<Partial<JoinOptions>>(
  new URL('../fixtures/join-recursive-tsx', import.meta.url),
  runJoinRecursiveTsx,
);

// --- T-15: Toggle idempotency ---
// Mirrors the shipped toggle decision in src/extension.ts: a node spanning a
// single line splits, a multi-line node joins. PRD §7 phrases this as
// `startPosition.row === endPosition.row`, which is equivalent to the
// `node.text.includes('\n')` check the command uses. Each fixture applies the
// toggle twice with a reparse in between; for canonical inputs the result is
// the original text, so `out.ts === in.ts` is a real idempotency assertion.
// Cases that cannot round-trip cleanly (sparse arrays, trailing-comma
// normalization, a line comment that makes join refuse) snapshot whatever the
// double toggle produces.
type ToggleOptions = Partial<SplitOptions> & Partial<JoinOptions>;

async function runToggleWith(
  languageId: string,
  input: string,
  opts: ToggleOptions | undefined,
): Promise<string> {
  const reparse = await reparserFor(languageId);
  const splitOpts: SplitOptions = { ...DEFAULT_SPLIT_OPTIONS, ...(opts ?? {}) };
  const joinOpts: JoinOptions = { ...(opts ?? {}) };

  const toggleOnce = (text: string): string => {
    const node = findFirstSupported(reparse(text).rootNode);
    if (!node) return text;

    const singleLine = node.startPosition.row === node.endPosition.row;
    if (singleLine) {
      const { newText, range } = splitNode(node, text, splitOpts);
      return text.slice(0, range.startIndex) + newText + text.slice(range.endIndex);
    }

    const result = joinNode(node, text, joinOpts);
    if ('refused' in result) return text; // join refused → toggle is a no-op
    const { newText, range } = result;
    return text.slice(0, range.startIndex) + newText + text.slice(range.endIndex);
  };

  return toggleOnce(toggleOnce(input));
}

const runToggle = (input: string, opts: ToggleOptions | undefined) =>
  runToggleWith('typescript', input, opts);
const runToggleTsx = (input: string, opts: ToggleOptions | undefined) =>
  runToggleWith('typescriptreact', input, opts);

for (const type of [
  'array',
  'object',
  'arguments',
  'formal_parameters',
  'array_pattern',
  'object_pattern',
  'named_imports',
  'export_clause',
  'type_arguments',
  'type_parameters',
  'tuple_type',
  'object_type',
]) {
  runFixtures<ToggleOptions>(new URL(`../fixtures/toggle/${type}`, import.meta.url), runToggle);
}
for (const type of ['jsx_opening_element', 'jsx_self_closing_element']) {
  runFixtures<ToggleOptions>(
    new URL(`../fixtures/toggle-tsx/${type}`, import.meta.url),
    runToggleTsx,
  );
}
