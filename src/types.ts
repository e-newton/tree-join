import { Point } from './parseSource';

export type JoinRefusal = {
  refused: 'width' | 'lineComment';
};

export type Range = {
  start: Point;
  startIndex: number;
  end: Point;
  endIndex: number;
};

export type ElementOffsets = {
  originalStart: number;
  originalEnd: number;
  newStart: number;
  newEnd: number;
};

export type TransformSuccess = {
  newText: string;
  range: Range;
  elements: ElementOffsets[];
};

export type TransformResult = TransformSuccess | JoinRefusal;
