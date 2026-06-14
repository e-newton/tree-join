import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Tree } from '../../src/parseSource';
import { parseSource } from '../../src/parseSource';
import { findTarget } from '../../src/select';

async function getTypescriptTree(source: string): Promise<Tree> {
  return await parseSource(source, 'typescript', async (filename: string) => {
    return readFileSync(join(__dirname, '../../wasm', filename));
  });
}

describe('findTarget', () => {
  // Column reference for `const x = [1, 2, 3]`:
  //                       0123456789012345678
  //                                 1111111111
  // `[`=10, `1`=11, `,`=12, ` `=13, `2`=14, `,`=15, ` `=16, `3`=17, `]`=18

  it('returns the array when cursor is inside an array literal', async () => {
    const tree = await getTypescriptTree('const x = [1, 2, 3]');
    const node = findTarget(tree, { row: 0, column: 11 }, 'typescript');

    expect(node).toBeDefined();
    expect(node?.type).toBe('array');
  });

  it('returns the array when cursor is on the opening bracket', async () => {
    const tree = await getTypescriptTree('const x = [1, 2, 3]');
    const node = findTarget(tree, { row: 0, column: 10 }, 'typescript');

    expect(node?.type).toBe('array');
  });

  it('returns the array when cursor is between siblings (on a comma)', async () => {
    const tree = await getTypescriptTree('const x = [1, 2, 3]');
    const node = findTarget(tree, { row: 0, column: 12 }, 'typescript');

    expect(node?.type).toBe('array');
  });

  it('returns the object when cursor is inside an object literal', async () => {
    // `const x = {a: 1}` — `{`=10, `a`=11, `:`=12, ` `=13, `1`=14, `}`=15
    const tree = await getTypescriptTree('const x = {a: 1}');
    const node = findTarget(tree, { row: 0, column: 11 }, 'typescript');

    expect(node?.type).toBe('object');
  });

  it('returns the innermost literal when cursor is inside a nested literal', async () => {
    // `const x = [[1, 2], 3]` — outer `[`=10, inner `[`=11, `1`=12, `]`=16, outer `]`=20
    const tree = await getTypescriptTree('const x = [[1, 2], 3]');
    const node = findTarget(tree, { row: 0, column: 12 }, 'typescript');

    expect(node?.type).toBe('array');
    expect(node?.startPosition.column).toBe(11);
    expect(node?.endPosition.column).toBe(17);
  });

  it('returns undefined when cursor is in an unsupported context', async () => {
    // `const x = "hello"` — `"`=10, `h`=11, `e`=12, `l`=13, `l`=14, `o`=15, `"`=16
    const tree = await getTypescriptTree('const x = "hello"');
    const node = findTarget(tree, { row: 0, column: 13 }, 'typescript');

    expect(node).toBeUndefined();
  });

  it('returns the outer array for a cursor on an interior line of a multi-line array', async () => {
    const source = [
      'const x = [', // row 0
      '  1,', // row 1
      '  2,', // row 2
      '  3,', // row 3
      ']', // row 4
    ].join('\n');
    const tree = await getTypescriptTree(source);
    // row 2, column 2 is on the `2`
    const node = findTarget(tree, { row: 2, column: 2 }, 'typescript');

    expect(node?.type).toBe('array');
    expect(node?.startPosition).toEqual({ row: 0, column: 10 });
    expect(node?.endPosition).toEqual({ row: 4, column: 1 });
  });

  it('returns the innermost object when a multi-line array contains an object on its own line', async () => {
    const source = [
      'const x = [', // row 0
      '  { a: 1 },', // row 1
      '  2,', // row 2
      ']', // row 3
    ].join('\n');
    const tree = await getTypescriptTree(source);
    // row 1, column 5 is on the `a` inside the inner object
    const node = findTarget(tree, { row: 1, column: 5 }, 'typescript');

    expect(node?.type).toBe('object');
    expect(node?.startPosition).toEqual({ row: 1, column: 2 });
    expect(node?.endPosition).toEqual({ row: 1, column: 10 });
  });

  it('returns the array when cursor is on the closing bracket line of a multi-line array', async () => {
    const source = [
      'const x = [', // row 0
      '  1,', // row 1
      ']', // row 2
    ].join('\n');
    const tree = await getTypescriptTree(source);
    // row 2, column 0 is on the closing `]`
    const node = findTarget(tree, { row: 2, column: 0 }, 'typescript');

    expect(node?.type).toBe('array');
  });
});
