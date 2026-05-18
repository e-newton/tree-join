import { descriptorFor } from './nodeTypes';
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

export function splitNode(
  node: SyntaxNode,
  source: string,
  opts: SplitOptions,
): { newText: string; range: Range } {
  const range: Range = {
    start: node.startPosition,
    startIndex: node.startIndex,
    end: node.endPosition,
    endIndex: node.endIndex,
  }; // Only applies to literals right now
  const descriptor = descriptorFor(node);

  if (!descriptor) {
    throw new Error('Unable to split: node not supported');
  }

  const sourceByLine = source.split('\n');
  const nodeStartRow = sourceByLine[node.startPosition.row];
  const nodeEndRow = sourceByLine[node.endPosition.row];

  if (!nodeStartRow) {
    throw new Error('Unable to split: Cannot find node start position');
  }

  if (!nodeEndRow) {
    throw new Error('Unable to split: Cannot find node end position');
  }

  const whiteSpaceBeforeCharacter = nodeStartRow.match(/\s*/)?.[0] ?? '';
  const childIndentTabString =
    whiteSpaceBeforeCharacter + (opts.insertSpaces ? ' '.repeat(opts.tabSize) : '\t');

  const elements: SyntaxNode[][] = [];

  let seenOpenToken = false;

  let elementRun = [];
  for (const childNode of node.children) {
    if (!childNode) continue;

    if (!seenOpenToken) {
      if (childNode.text === descriptor.openToken) {
        seenOpenToken = true;
      }
      continue;
    }

    if (childNode.text === descriptor.closeToken) {
      elements.push(elementRun);
      break;
    }

    if (childNode.text === descriptor.separator) {
      elementRun.push(childNode);

      if (childNode.nextNamedSibling?.type === 'comment') {
        elementRun.push(childNode.nextNamedSibling);
      }

      elements.push(elementRun);
      elementRun = [];
      continue;
    }

    const lastRun = elements.at(-1);
    if (lastRun && lastRun.find((aNode) => aNode.equals(childNode))) {
      continue;
    }

    elementRun.push(childNode);
  }

  const elementStrings = elements
    .filter((run) => !!run.length)
    .map((run) => {
      const firstIndex = run.at(0)?.startIndex ?? 0;
      const lastIndex = run.at(-1)?.endIndex ?? 0;

      return childIndentTabString + source.slice(firstIndex, lastIndex);
    });

  let lastElement = elementStrings.at(-1);
  if (lastElement && !lastElement.endsWith(descriptor.separator)) {
    lastElement += descriptor.separator;
    elementStrings.pop();
    elementStrings.push(lastElement);
  }

  const body = elementStrings.join('\n');
  const paddedEnd = whiteSpaceBeforeCharacter + descriptor.closeToken;
  const finalString = descriptor.openToken + '\n' + body + '\n' + paddedEnd;

  return { newText: finalString, range };
}
