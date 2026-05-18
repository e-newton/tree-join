import { Position, TextDocument, Range as VsCodeRange } from 'vscode';
import { Range } from './types';
import { Point } from './parseSource';

export function toVsCodeRange(range: Range): VsCodeRange {
  const startPosition = new Position(range.start.row, range.start.column);
  const endPosition = new Position(range.end.row, range.end.column);

  return new VsCodeRange(startPosition, endPosition);
}

export function toParserRange(range: VsCodeRange, document: TextDocument): Range {
  const startPosition: Point = { row: range.start.line, column: range.start.character };
  const endPosition: Point = { row: range.end.line, column: range.end.character };

  return {
    start: startPosition,
    startIndex: document.offsetAt(range.start),
    end: endPosition,
    endIndex: document.offsetAt(range.end),
  };
}

export function toParserPoint(position: Position): Point {
  return {
    row: position.line,
    column: position.character,
  };
}
