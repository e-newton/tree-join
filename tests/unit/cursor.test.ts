import { describe, expect, it } from 'vitest';
import { mapCursorOffsets } from '../../src/cursor';
import type { ElementOffsets, TransformSuccess } from '../../src/types';

function fakeEdit(
  startIndex: number,
  endIndex: number,
  newText: string,
  elements: ElementOffsets[],
): TransformSuccess {
  return {
    newText,
    range: {
      startIndex,
      endIndex,
      start: { row: 0, column: startIndex },
      end: { row: 0, column: endIndex },
    },
    elements,
  };
}

describe('mapCursorOffsets', () => {
  // Source: `const x = [1, 2, 3]` (the literal occupies offsets 10..19).
  //          0         1
  //          0123456789012345678
  // After splitting, `[1, 2, 3]` becomes `[\n  1,\n  2,\n  3,\n]` (length 18).
  //   newText offsets: 0=`[` 1=`\n` 2-3=`  ` 4=`1` 5=`,` 6=`\n` 7-8=`  ` 9=`2` 10=`,` 11=`\n`
  //                    12-13=`  ` 14=`3` 15=`,` 16=`\n` 17=`]`
  const splitEdit = fakeEdit(10, 19, '[\n  1,\n  2,\n  3,\n]', [
    { originalStart: 11, originalEnd: 12, newStart: 4, newEnd: 5 },
    { originalStart: 14, originalEnd: 15, newStart: 9, newEnd: 10 },
    { originalStart: 17, originalEnd: 18, newStart: 14, newEnd: 15 },
  ]);

  it('maps a cursor inside the first element to the new element position', () => {
    // cursor on `1` at source 11 → newText offset 4 → absolute 14
    expect(mapCursorOffsets([splitEdit], [11])).toEqual([14]);
  });

  it('maps a cursor inside the last element', () => {
    // cursor on `3` at source 17 → newText offset 14 → absolute 24
    expect(mapCursorOffsets([splitEdit], [17])).toEqual([24]);
  });

  it('falls back to the node start when cursor is on the opening bracket', () => {
    expect(mapCursorOffsets([splitEdit], [10])).toEqual([10]);
  });

  it('falls back to the node start when cursor is on a separator/whitespace between elements', () => {
    // offset 13 = the space between `,` and `2` — not inside any element
    expect(mapCursorOffsets([splitEdit], [13])).toEqual([10]);
  });

  it('leaves cursors before the edit unchanged', () => {
    expect(mapCursorOffsets([splitEdit], [5])).toEqual([5]);
  });

  it('shifts cursors after the edit by the length delta', () => {
    // delta = newText.length(18) - (endIndex - startIndex)(9) = 9
    // cursor at 20 → 29
    expect(mapCursorOffsets([splitEdit], [20])).toEqual([29]);
  });

  it('treats cursor at the closing bracket as inside the last element', () => {
    // source offset 18 = `]`; last element originalEnd is 18 (inclusive in mapper)
    // → newText offset 14 + (18-17)=1 = 15 → absolute 25
    expect(mapCursorOffsets([splitEdit], [18])).toEqual([25]);
  });

  it('handles multi-cursor across multiple edits with cumulative deltas', () => {
    // Two unrelated literals far apart in the same document.
    // editA covers [0,3): `[1]` → `[\n1\n]` (length 5, delta +2)
    // editB covers [50,53): `[2]` → `[\n2\n]` (length 5, delta +2)
    const editA = fakeEdit(0, 3, '[\n1\n]', [
      { originalStart: 1, originalEnd: 2, newStart: 2, newEnd: 3 },
    ]);
    const editB = fakeEdit(50, 53, '[\n2\n]', [
      { originalStart: 51, originalEnd: 52, newStart: 2, newEnd: 3 },
    ]);

    // Cursor 1 inside A: source 1 → 0 + 2 + 0 (offset-in-element) = 2
    // Cursor 2 inside B: source 51 → 50 + 2 + (editA delta 2) = 54
    // Cursor 3 after both: 60 + 2 + 2 = 64
    expect(mapCursorOffsets([editA, editB], [1, 51, 60])).toEqual([2, 54, 64]);
  });

  it('clamps offset within element when the new element is shorter than the original', () => {
    // Contrived: original element span 6 chars, new element span 3 chars.
    // Cursor 5 chars into element should clamp to end of new element.
    const edit = fakeEdit(0, 10, '[abc]', [
      { originalStart: 1, originalEnd: 7, newStart: 1, newEnd: 4 },
    ]);
    // cursor at source 6 → offsetInElement = 5 → clamped to 3 → newText offset 4
    expect(mapCursorOffsets([edit], [6])).toEqual([4]);
  });

  it('sorts edits by start index so callers can pass them in any order', () => {
    const editA = fakeEdit(0, 3, '[\n1\n]', [
      { originalStart: 1, originalEnd: 2, newStart: 2, newEnd: 3 },
    ]);
    const editB = fakeEdit(50, 53, '[\n2\n]', [
      { originalStart: 51, originalEnd: 52, newStart: 2, newEnd: 3 },
    ]);

    expect(mapCursorOffsets([editB, editA], [1, 51, 60])).toEqual([2, 54, 64]);
  });

  it('handles an empty-elements edit by falling back to node start', () => {
    // Cursor inside `[]` (no elements).
    const emptyEdit = fakeEdit(10, 12, '[\n]', []);
    expect(mapCursorOffsets([emptyEdit], [11])).toEqual([10]);
  });

  it('returns cursors unchanged when there are no edits', () => {
    expect(mapCursorOffsets([], [5, 10, 100])).toEqual([5, 10, 100]);
  });
});
