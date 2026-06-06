import { describe, expect, it } from 'vitest';
import { normalizeRulers, resolveMaxJoinLength } from '../../src/configResolve';

describe('normalizeRulers', () => {
  it('returns [] for non-array input', () => {
    expect(normalizeRulers(undefined)).toEqual([]);
    expect(normalizeRulers(null)).toEqual([]);
    expect(normalizeRulers(80)).toEqual([]);
  });

  it('passes through plain number columns in order', () => {
    expect(normalizeRulers([80, 120])).toEqual([80, 120]);
  });

  it('extracts the column from object rulers', () => {
    expect(normalizeRulers([{ column: 80, color: '#f00' }, { column: 100 }])).toEqual([80, 100]);
  });

  it('handles a mix of numbers and objects, dropping malformed entries', () => {
    expect(normalizeRulers([80, { column: 100 }, { color: '#0f0' }, 'nope'])).toEqual([80, 100]);
  });
});

describe('resolveMaxJoinLength', () => {
  it('uses a positive raw value as-is', () => {
    expect(resolveMaxJoinLength(90, [])).toBe(90);
    expect(resolveMaxJoinLength(90, [80, 120])).toBe(90);
    expect(resolveMaxJoinLength(100, [])).toBe(100);
  });

  it('falls back to the first ruler when raw is 0', () => {
    expect(resolveMaxJoinLength(0, [80, 120])).toBe(80);
    expect(resolveMaxJoinLength(0, [120])).toBe(120);
  });

  it('falls back to 100 when raw is 0 and no rulers are configured', () => {
    expect(resolveMaxJoinLength(0, [])).toBe(100);
  });

  it('treats non-positive ruler columns as absent', () => {
    expect(resolveMaxJoinLength(0, [0, 80])).toBe(100);
  });

  it('falls back when raw is negative or not finite', () => {
    expect(resolveMaxJoinLength(-1, [80])).toBe(80);
    expect(resolveMaxJoinLength(Number.NaN, [])).toBe(100);
  });
});
