import { Position, Range as VsCodeRange } from 'vscode';
import { Range } from './types';

export function toVsCodeRange(range: Range): VsCodeRange {
  const startPosition = new Position(range.start.row, range.start.column);
  const endPosition = new Position(range.end.row, range.end.column);

  return new VsCodeRange(startPosition, endPosition);
}
