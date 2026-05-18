import { readFileSync } from 'node:fs';
import { parseSource, SyntaxNode, Tree } from '../../src/parseSource';
import { splitNode, SplitOptions } from '../../src/split';
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

runFixtures(new URL('../fixtures/sample', import.meta.url), async (input) => input);
runFixtures(new URL('../fixtures/split/literals', import.meta.url), async (input) => {
  const tree = await getTypescriptTree(input);
  const node = findFirstSupported(tree.rootNode);

  if (!node) throw Error('Cannot find supported node');

  const OPTIONS: SplitOptions = {
    tabSize: 2,
    insertSpaces: true,
  };

  const { newText, range } = splitNode(node, input, OPTIONS);
  return input.slice(0, range.startIndex) + newText + input.slice(range.endIndex);
});
