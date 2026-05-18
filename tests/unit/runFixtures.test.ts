import { readFileSync } from 'node:fs';
import { parseSource, SyntaxNode, Tree } from '../../src/parseSource';
import { splitNode, SplitOptions } from '../../src/split';
import { joinNode, JoinOptions } from '../../src/join';
import { runFixtures } from '../runFixtures';
import { join } from 'node:path';
import { isSupported } from '../../src/nodeTypes';

async function getTypescriptTree(source: string): Promise<Tree> {
  return await parseSource(source, 'typescript', async (filename: string) => {
    return readFileSync(join(__dirname, '../../wasm', filename));
  });
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

async function runSplit(input: string, opts: Partial<SplitOptions> | undefined): Promise<string> {
  const tree = await getTypescriptTree(input);
  const node = findFirstSupported(tree.rootNode);

  if (!node) throw Error('Cannot find supported node');

  const resolved: SplitOptions = { ...DEFAULT_SPLIT_OPTIONS, ...(opts ?? {}) };
  const { newText, range } = splitNode(node, input, resolved);
  return input.slice(0, range.startIndex) + newText + input.slice(range.endIndex);
}

const DEFAULT_JOIN_OPTIONS: JoinOptions = {};

async function runJoin(input: string, opts: Partial<JoinOptions> | undefined): Promise<string> {
  const tree = await getTypescriptTree(input);
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

runFixtures(new URL('../fixtures/sample', import.meta.url), async (input) => input);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/literals', import.meta.url),
  runSplit,
);
runFixtures<Partial<SplitOptions>>(
  new URL('../fixtures/split/literals-tabs', import.meta.url),
  (input, opts) => runSplit(input, { insertSpaces: false, ...(opts ?? {}) }),
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
