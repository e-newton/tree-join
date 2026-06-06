import { readFileSync } from 'node:fs';
import { parseSource, SyntaxNode, Tree } from '../../src/parseSource';
import { splitNode, SplitOptions } from '../../src/split';
import { joinNode, JoinOptions } from '../../src/join';
import { runFixtures } from '../runFixtures';
import { join } from 'node:path';
import { isSupported } from '../../src/nodeTypes';

async function getTree(source: string, languageId: string): Promise<Tree> {
  return await parseSource(source, languageId, async (filename: string) => {
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
