import { descriptorFor, NodeTypeDescriptor } from './nodeTypes';
import { Point, SyntaxNode } from './parseSource';

export type SplitOptions = {
  tabSize: number;
  insertSpaces: boolean;
};

type Range = {
  start: Point;
  startIndex: number;
  end: Point;
  endIndex: number;
};

type Run = {
  nodes: SyntaxNode[];
  hasSeparator: boolean;
};

export function splitNode(
  node: SyntaxNode,
  source: string,
  opts: SplitOptions,
): { newText: string; range: Range } {
  const descriptor = descriptorFor(node);

  if (!descriptor) {
    throw new Error('Unable to split: node not supported');
  }

  const range: Range = {
    start: node.startPosition,
    startIndex: node.startIndex,
    end: node.endPosition,
    endIndex: node.endIndex,
  }; // Only applies to literals right now

  const lineStart = node.startIndex - node.startPosition.column;
  const baseIndent = source.slice(lineStart, node.startIndex).match(/^\s*/)?.[0] ?? '';

  const childIndentTabString = baseIndent + (opts.insertSpaces ? ' '.repeat(opts.tabSize) : '\t');

  const elementRuns = getAllElementRuns(node, descriptor);

  if (elementRuns.length === 0) {
    return {
      newText: node.text,
      range,
    };
  }

  const elementStrings = createElementStrings(
    elementRuns,
    descriptor,
    source,
    childIndentTabString,
  );

  const body = elementStrings.join('\n');
  const paddedEnd = baseIndent + descriptor.closeToken;
  const finalString = descriptor.openToken + '\n' + body + '\n' + paddedEnd;

  return { newText: finalString, range };
}

function getAllElementRuns(node: SyntaxNode, descriptor: NodeTypeDescriptor): Run[] {
  const runs: Run[] = [];

  let seenOpenToken = false;
  let pendingTrailingComment = false;
  let lastPushedToken: SyntaxNode | null = null;

  let currentRun: Run = {
    nodes: [],
    hasSeparator: false,
  };

  for (const childNode of node.children) {
    if (!childNode) continue;

    if (!seenOpenToken) {
      if (childNode.type === descriptor.openToken) {
        seenOpenToken = true;
      }
      continue;
    }

    if (childNode.type === descriptor.closeToken) {
      if (currentRun.nodes.length) {
        runs.push(currentRun);
      }
      break;
    }

    if (childNode.type === descriptor.separator) {
      if (currentRun.nodes.length) {
        pendingTrailingComment = true;
        runs.push(currentRun);
      }
      currentRun = {
        nodes: [],
        hasSeparator: false,
      };
      continue;
    }

    const lastRun = runs.at(-1);
    if (
      lastRun &&
      pendingTrailingComment &&
      lastPushedToken &&
      childNode.type === 'comment' &&
      childNode.startPosition.row === lastPushedToken.endPosition.row
    ) {
      lastRun.hasSeparator = true;
      lastRun.nodes.push(childNode);
      pendingTrailingComment = false;
      continue;
    }

    pendingTrailingComment = false;
    currentRun.nodes.push(childNode);
    lastPushedToken = childNode;
  }

  return runs;
}

function createElementStrings(
  runs: Run[],
  descriptor: NodeTypeDescriptor,
  source: string,
  childIndentTabString: string,
) {
  const elementStrings = runs.map((run) => {
    const firstIndex = run.nodes.at(0)?.startIndex ?? 0;
    const lastIndex = run.nodes.at(-1)?.endIndex ?? 0;

    return (
      childIndentTabString +
      source.slice(firstIndex, lastIndex) +
      (run.hasSeparator ? '' : descriptor.separator)
    );
  });

  return elementStrings;
}
