import { describe, expect, it } from 'vitest';
import {
  formatStatus,
  NO_TARGET_MESSAGE,
  PARSE_FAILED_MESSAGE,
  REFUSAL_MESSAGES,
  UNSUPPORTED_LANGUAGE_MESSAGE,
} from '../../src/status';

describe('formatStatus', () => {
  it('prefixes a single message', () => {
    expect(formatStatus([UNSUPPORTED_LANGUAGE_MESSAGE])).toBe('tree-join: unsupported language');
  });

  it('joins distinct causes from a multi-cursor run', () => {
    expect(formatStatus([REFUSAL_MESSAGES.width, NO_TARGET_MESSAGE])).toBe(
      'tree-join: cannot join — exceeds max line length | no splittable node',
    );
  });

  it('accepts a Set, preserving insertion order and de-duplication', () => {
    const messages = new Set([NO_TARGET_MESSAGE, NO_TARGET_MESSAGE, REFUSAL_MESSAGES.lineComment]);
    expect(formatStatus(messages)).toBe(
      'tree-join: no splittable node | cannot join — line comment',
    );
  });
});

describe('message catalog', () => {
  it('covers every join refusal code', () => {
    expect(Object.keys(REFUSAL_MESSAGES).sort()).toEqual(['lineComment', 'width']);
  });

  it('states a cause rather than just failing', () => {
    const all = [
      ...Object.values(REFUSAL_MESSAGES),
      NO_TARGET_MESSAGE,
      UNSUPPORTED_LANGUAGE_MESSAGE,
      PARSE_FAILED_MESSAGE,
    ];
    for (const message of all) {
      expect(message.length).toBeGreaterThan(0);
      // The `tree-join: ` prefix is formatStatus's job — messages must not
      // carry their own, or the status bar reads "tree-join: tree-join: …".
      expect(message.startsWith('tree-join')).toBe(false);
    }
  });
});
