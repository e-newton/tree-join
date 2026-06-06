import { NodeTypeDescriptor, separatorsFor } from './nodeTypes';
import { SyntaxNode } from './parseSource';

export type Run = {
  nodes: SyntaxNode[];
  hasSeparator: boolean;
};

export function groupIntoRuns(children: SyntaxNode[], descriptor: NodeTypeDescriptor): Run[] {
  const runs: Run[] = [];
  const separators = separatorsFor(descriptor);

  let expectingElement = true;
  let attachTrailingCommentToPrev = false;
  let lastPushedToken: SyntaxNode | null = null;
  let currentRun: Run = { nodes: [], hasSeparator: false };

  for (const child of children) {
    if (separators.includes(child.type)) {
      if (expectingElement) {
        runs.push({ nodes: [], hasSeparator: false });
      } else {
        runs.push(currentRun);
        currentRun = { nodes: [], hasSeparator: false };
        expectingElement = true;
        attachTrailingCommentToPrev = true;
      }
      continue;
    }

    const lastRun = runs.at(-1);
    if (
      lastRun &&
      attachTrailingCommentToPrev &&
      lastPushedToken &&
      child.type === 'comment' &&
      child.startPosition.row === lastPushedToken.endPosition.row
    ) {
      lastRun.nodes.push(child);
      lastRun.hasSeparator = true;
      attachTrailingCommentToPrev = false;
      continue;
    }

    attachTrailingCommentToPrev = false;
    currentRun.nodes.push(child);
    expectingElement = false;
    lastPushedToken = child;
  }

  if (currentRun.nodes.length) {
    runs.push(currentRun);
  }

  return runs;
}
