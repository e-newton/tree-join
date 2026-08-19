import * as vscode from 'vscode';
import { initParser, parserFor } from './parser';
import { findTarget } from './select';
import { toParserPoint } from './helpers';
import { joinNode, JoinOptions } from './join';
import { applyTransforms } from './apply';
import { JoinRefusal, TransformResult } from './types';
import { splitNode, SplitOptions } from './split';
import { joinRecursive, Reparse, splitRecursive } from './recursive';
import { GrammarKey, LANGUAGE_ID_TO_GRAMMAR, SyntaxNode } from './parseSource';
import { joinOptionsFor, splitOptionsFor } from './config';

type NoTarget = { kind: 'noTarget' };
type CursorOutcome = TransformResult | NoTarget;

const REFUSAL_MESSAGES: Record<JoinRefusal['refused'], string> = {
  lineComment: 'cannot join — line comment',
  width: 'cannot join — exceeds max line length',
};

type TransformPicker = (
  node: SyntaxNode,
  source: string,
  splitOpts: SplitOptions,
  joinOpts: JoinOptions,
  parse: Reparse,
  grammar: GrammarKey,
) => TransformResult;

/**
 * Drop targets nested inside another resolved target and collapse exact
 * duplicates, so concurrent cursors never produce overlapping edits — two
 * cursors in one construct resolve to the same node, and a cursor in a nested
 * construct resolves inside its parent's range. A `WorkspaceEdit` cannot apply
 * either pair coherently (both would rewrite the same text), so the outermost
 * target wins: for the recursive commands its recursion subsumes the inner
 * cursor's intent, and for the plain ones it is the transform the user can
 * still see happen.
 */
function dedupTargets(targets: (SyntaxNode | undefined)[]): (SyntaxNode | undefined)[] {
  const defined = targets.filter((n): n is SyntaxNode => !!n);
  const seen = new Set<string>();
  const unique: SyntaxNode[] = [];

  for (const node of defined) {
    const containedInAnother = defined.some(
      (other) =>
        other !== node &&
        other.startIndex <= node.startIndex &&
        node.endIndex <= other.endIndex &&
        !(other.startIndex === node.startIndex && other.endIndex === node.endIndex),
    );
    if (containedInAnother) continue;

    const key = `${node.startIndex}:${node.endIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(node);
  }

  return targets.some((n) => !n) ? [undefined, ...unique] : unique;
}

async function runOnCursors(pick: TransformPicker): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const parser = await parserFor(editor.document.languageId);
  if (!parser) {
    return;
  }
  const grammar = LANGUAGE_ID_TO_GRAMMAR[editor.document.languageId];
  if (!grammar) {
    return;
  }
  const source = editor.document.getText();
  const tree = parser.parse(source);
  if (!tree) {
    return;
  }
  try {
    const splitOpts = splitOptionsFor(editor);
    const joinOpts = joinOptionsFor(editor);
    const parse: Reparse = (text) => {
      const next = parser.parse(text);
      if (!next) throw new Error('tree-join: re-parse failed during recursive transform');
      return next;
    };

    const targets = dedupTargets(
      editor.selections.map((sel) => findTarget(tree, toParserPoint(sel.active), grammar)),
    );

    const outcomes: CursorOutcome[] = targets.map((node) => {
      if (!node) {
        return { kind: 'noTarget' };
      }
      return pick(node, source, splitOpts, joinOpts, parse, grammar);
    });

    const transforms = outcomes.filter((o): o is TransformResult => !('kind' in o));
    await applyTransforms(editor, transforms);

    const messages = new Set<string>();
    for (const outcome of outcomes) {
      if ('kind' in outcome) {
        messages.add('no splittable node');
      } else if ('refused' in outcome) {
        messages.add(REFUSAL_MESSAGES[outcome.refused]);
      }
    }
    if (messages.size) {
      vscode.window.setStatusBarMessage(`tree-join: ${Array.from(messages).join(' | ')}`, 3000);
    }
  } finally {
    tree.delete();
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  initParser(context);

  context.subscriptions.push(
    vscode.commands.registerCommand('tree-join.join', () =>
      runOnCursors((node, source, _splitOpts, joinOpts, _parse, grammar) =>
        joinNode(node, source, joinOpts, grammar),
      ),
    ),
    vscode.commands.registerCommand('tree-join.split', () =>
      runOnCursors((node, source, splitOpts, _joinOpts, _parse, grammar) =>
        splitNode(node, source, splitOpts, grammar),
      ),
    ),
    vscode.commands.registerCommand('tree-join.toggle', () =>
      runOnCursors((node, source, splitOpts, joinOpts, _parse, grammar) =>
        node.text.includes('\n')
          ? joinNode(node, source, joinOpts, grammar)
          : splitNode(node, source, splitOpts, grammar),
      ),
    ),
    vscode.commands.registerCommand('tree-join.splitRecursive', () =>
      runOnCursors((node, source, splitOpts, _joinOpts, parse, grammar) =>
        splitRecursive(node, source, splitOpts, parse, grammar),
      ),
    ),
    vscode.commands.registerCommand('tree-join.joinRecursive', () =>
      runOnCursors((node, source, _splitOpts, joinOpts, parse, grammar) =>
        joinRecursive(node, source, joinOpts, parse, grammar),
      ),
    ),
  );
}

export function deactivate(): void {}
