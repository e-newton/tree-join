import { descriptorFor, NodeTypeDescriptor } from './nodeTypes';
import { SyntaxNode } from './parseSource';
import { ElementOffsets, Range, TransformSuccess } from './types';

export type SplitOptions = {
  tabSize: number;
  insertSpaces: boolean;
};

type Run = {
  nodes: SyntaxNode[];
  hasSeparator: boolean;
};

export function splitNode(node: SyntaxNode, source: string, opts: SplitOptions): TransformSuccess {
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
      elements: [],
    };
  }

  const firstElementOffsetInNewText = descriptor.openToken.length + 1; // openToken + '\n'
  const { strings, elements } = buildElements(
    elementRuns,
    descriptor,
    source,
    childIndentTabString,
    firstElementOffsetInNewText,
  );

  const body = strings.join('\n');
  const paddedEnd = baseIndent + descriptor.closeToken;
  const finalString = descriptor.openToken + '\n' + body + '\n' + paddedEnd;

  return { newText: finalString, range, elements };
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

function buildElements(
  runs: Run[],
  descriptor: NodeTypeDescriptor,
  source: string,
  childIndentTabString: string,
  firstElementOffsetInNewText: number,
): { strings: string[]; elements: ElementOffsets[] } {
  const strings: string[] = [];
  const elements: ElementOffsets[] = [];
  let offset = firstElementOffsetInNewText;

  for (const run of runs) {
    const firstIndex = run.nodes.at(0)?.startIndex ?? 0;
    const lastIndex = run.nodes.at(-1)?.endIndex ?? 0;
    const content = source.slice(firstIndex, lastIndex);
    const sep = run.hasSeparator ? '' : descriptor.separator;
    const line = childIndentTabString + content + sep;
    const contentStart = offset + childIndentTabString.length;

    elements.push({
      originalStart: firstIndex,
      originalEnd: lastIndex,
      newStart: contentStart,
      newEnd: contentStart + content.length,
    });

    strings.push(line);
    offset += line.length + 1; // +1 for the '\n' joining element lines
  }

  return { strings, elements };
}
