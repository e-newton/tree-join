import { TransformSuccess } from './types';

export function mapCursorOffsets(edits: TransformSuccess[], originalCursors: number[]): number[] {
  const sorted = [...edits].sort((a, b) => a.range.startIndex - b.range.startIndex);
  return originalCursors.map((cursor) => mapCursor(sorted, cursor));
}

function mapCursor(sortedEdits: TransformSuccess[], cursor: number): number {
  let delta = 0;

  for (const edit of sortedEdits) {
    const { startIndex, endIndex } = edit.range;

    if (cursor < startIndex) break;

    if (cursor >= endIndex) {
      delta += edit.newText.length - (endIndex - startIndex);
      continue;
    }

    return mapInsideEdit(edit, cursor) + delta;
  }

  return cursor + delta;
}

function mapInsideEdit(edit: TransformSuccess, cursor: number): number {
  const base = edit.range.startIndex;

  for (const elem of edit.elements) {
    if (cursor >= elem.originalStart && cursor <= elem.originalEnd) {
      const offsetInElement = cursor - elem.originalStart;
      const elementLength = elem.newEnd - elem.newStart;
      const clampedOffset = Math.min(offsetInElement, elementLength);
      return base + elem.newStart + clampedOffset;
    }
  }

  // Cursor is inside the node but not in any element (bracket, separator, whitespace).
  // PRD §6 fallback: place at the start of the transformed node.
  return base;
}
