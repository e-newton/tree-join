/**
 * Pure, vscode-free status-message text. Kept separate from `extension.ts`
 * (which imports the vscode API) so the message catalog and formatting can be
 * unit-tested directly, mirroring `configResolve.ts` / `config.ts`.
 */

import { JoinRefusal } from './types';

export const REFUSAL_MESSAGES: Record<JoinRefusal['refused'], string> = {
  lineComment: 'cannot join — line comment',
  width: 'cannot join — exceeds max line length',
};

/** No cursor resolved to a supported construct in a language we do parse. */
export const NO_TARGET_MESSAGE = 'no splittable node';

/** The document's language has no grammar, so no command can ever apply. */
export const UNSUPPORTED_LANGUAGE_MESSAGE = 'unsupported language';

/** The grammar loaded but tree-sitter returned no tree for this document. */
export const PARSE_FAILED_MESSAGE = 'could not parse this document';

/**
 * Render collected messages as a single status-bar line. Distinct causes are
 * joined so a multi-cursor run reports each one once (e.g. one cursor refused
 * on width while another had no target).
 */
export function formatStatus(messages: Iterable<string>): string {
  return `tree-join: ${Array.from(messages).join(' | ')}`;
}
