import * as vscode from 'vscode';
import { initParser, parserFor } from './parser';
import { findTarget } from './select';
import { toParserPoint } from './helpers';
import { joinNode } from './join';
import { applyTransforms } from './apply';
import { JoinRefusal, TransformResult } from './types';
import { splitNode, SplitOptions } from './split';
import { joinRecursive, Reparse, splitRecursive } from './recursive';
import { SyntaxNode } from './parseSource';

type NoTarget = { kind: 'noTarget' };
type CursorOutcome = TransformResult | NoTarget;

const REFUSAL_MESSAGES: Record<JoinRefusal['refused'], string> = {
  lineComment: 'cannot join — line comment',
  width: 'cannot join — exceeds max line length',
};

function resolveSplitOptions(editor: vscode.TextEditor): SplitOptions {
  const { tabSize, insertSpaces } = editor.options;
  return {
    tabSize: typeof tabSize === 'number' ? tabSize : 2,
    insertSpaces: typeof insertSpaces === 'boolean' ? insertSpaces : true,
  };
}

type TransformPicker = (
  node: SyntaxNode,
  source: string,
  splitOpts: SplitOptions,
  parse: Reparse,
) => TransformResult;

/**
 * Drop targets nested inside another resolved target (keep the outermost — its
 * recursion subsumes the inner cursor's intent) and collapse exact duplicates,
 * so concurrent cursors never produce overlapping edits.
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

async function runOnCursors(pick: TransformPicker, dedup = false): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const parser = await parserFor(editor.document.languageId);
  if (!parser) {
    return;
  }
  const source = editor.document.getText();
  const tree = parser.parse(source);
  if (!tree) {
    return;
  }
  try {
    const splitOpts = resolveSplitOptions(editor);
    const parse: Reparse = (text) => {
      const next = parser.parse(text);
      if (!next) throw new Error('tree-join: re-parse failed during recursive transform');
      return next;
    };

    let targets = editor.selections.map((sel) => findTarget(tree, toParserPoint(sel.active)));
    if (dedup) {
      targets = dedupTargets(targets);
    }

    const outcomes: CursorOutcome[] = targets.map((node) => {
      if (!node) {
        return { kind: 'noTarget' };
      }
      return pick(node, source, splitOpts, parse);
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
      runOnCursors((node, source) => joinNode(node, source, {})),
    ),
    vscode.commands.registerCommand('tree-join.split', () =>
      runOnCursors((node, source, splitOpts) => splitNode(node, source, splitOpts)),
    ),
    vscode.commands.registerCommand('tree-join.toggle', () =>
      runOnCursors((node, source, splitOpts) =>
        node.text.includes('\n') ? joinNode(node, source, {}) : splitNode(node, source, splitOpts),
      ),
    ),
    vscode.commands.registerCommand('tree-join.splitRecursive', () =>
      runOnCursors(
        (node, source, splitOpts, parse) => splitRecursive(node, source, splitOpts, parse),
        true,
      ),
    ),
    vscode.commands.registerCommand('tree-join.joinRecursive', () =>
      runOnCursors(
        (node, source, _splitOpts, parse) => joinRecursive(node, source, {}, parse),
        true,
      ),
    ),
  );
}

export function deactivate(): void {}
