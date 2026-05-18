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

export function joinNode(
  node: SyntaxNode,
  source: string,
  opts: JoinOptions,
): { newText: string; range: Range } | { refused: 'width' | 'lineComment' } {
  const range: Range = {
    start: node.startPosition,
    startIndex: node.startIndex,
    end: node.endPosition,
    endIndex: node.endIndex,
  }; // Only applies to literals right now
  return {
    newText: 'stub',
    range,
  };
}
