/**
 * Pure, vscode-free settings resolution. Kept separate from `config.ts` (which
 * imports the vscode API) so these can be unit-tested directly.
 */

export type TrailingComma = 'add' | 'preserve' | 'never';

const DEFAULT_MAX_JOIN_LENGTH = 100;

/**
 * Flatten the `editor.rulers` setting (entries are either a column number or a
 * `{ column, color }` object) into an ordered list of column numbers.
 */
export function normalizeRulers(rulers: unknown): number[] {
  if (!Array.isArray(rulers)) return [];
  const out: number[] = [];
  for (const ruler of rulers) {
    if (typeof ruler === 'number') {
      out.push(ruler);
    } else if (
      ruler &&
      typeof ruler === 'object' &&
      typeof (ruler as { column?: unknown }).column === 'number'
    ) {
      out.push((ruler as { column: number }).column);
    }
  }
  return out;
}

/**
 * Resolve the effective max join length. A positive `raw` is used as-is; `0`
 * (the documented "use rulers" sentinel) falls back to the first editor ruler
 * column, and finally to 100 when no ruler is configured.
 */
export function resolveMaxJoinLength(raw: number, rulers: number[]): number {
  if (Number.isFinite(raw) && raw > 0) return raw;
  const first = rulers[0];
  if (typeof first === 'number' && first > 0) return first;
  return DEFAULT_MAX_JOIN_LENGTH;
}
