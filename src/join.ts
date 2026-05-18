import { descriptorFor } from './nodeTypes';
import { Point, SyntaxNode } from './parseSource';

type Range = {
  start: Point;
  startIndex: number;
  end: Point;
  endIndex: number;
};

export type JoinOptions = {
  maxJoinLength?: number;
};

type Run = {
  nodes: SyntaxNode[];
};

export function joinNode(
  node: SyntaxNode,
  source: string,
  opts: JoinOptions,
): { newText: string; range: Range } | { refused: 'width' | 'lineComment' } {
  const descriptor = descriptorFor(node);

  if (!descriptor) {
    throw new Error('Unable to join: node not supported');
  }

  const range: Range = {
    start: node.startPosition,
    startIndex: node.startIndex,
    end: node.endPosition,
    endIndex: node.endIndex,
  }; // Only applies to literals right now

  const runs: Run[] = [];

  let seenOpenToken = false;
  let pendingTrailingComment = false;
  let lastPushedToken: SyntaxNode | null = null;
  let currentRun: Run = {
    nodes: [],
  };

  for (const childNode of node.children) {
    if (!childNode) continue;

    if (!seenOpenToken) {
      if (childNode.type === descriptor.openToken) {
        seenOpenToken = true;
      }
      continue;
    }

    if (childNode.type === 'comment' && childNode.text.startsWith('//')) {
      return {
        refused: 'lineComment',
      };
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
        currentRun = {
          nodes: [],
        };
      }
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
      lastRun.nodes.push(childNode);
      pendingTrailingComment = false;
      continue;
    }

    pendingTrailingComment = false;
    currentRun.nodes.push(childNode);
    lastPushedToken = childNode;
  }

  if (!runs.length) {
    return {
      newText: node.text,
      range,
    };
  }

  let body = runs.map((run) => run.nodes.map((n) => n.text).join(' ')).join(', ');

  if (descriptor.bracketSpacing) {
    body = ' ' + body + ' ';
  }

  const newText = descriptor.openToken + body + descriptor.closeToken;

  if (opts.maxJoinLength !== undefined) {
    const startText = source.slice(node.startIndex - node.startPosition.column, node.startIndex);
    const nlIdx = source.indexOf('\n', node.endIndex);
    const endText = source.slice(node.endIndex, nlIdx === -1 ? source.length : nlIdx);
    if ((startText + newText + endText).length > opts.maxJoinLength) {
      return {
        refused: 'width',
      };
    }
  }

  return { newText, range };
}
