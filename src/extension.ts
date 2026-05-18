import * as vscode from 'vscode';
import { getTree, initParser } from './parser';
import { findTarget } from './select';
import { toParserPoint } from './helpers';
import { joinNode } from './join';
import { applyTransforms } from './apply';
import { JoinRefusal, TransformResult } from './types';
import { splitNode, SplitOptions } from './split';
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
) => TransformResult;

async function runOnCursors(pick: TransformPicker): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const tree = await getTree(editor.document);
  if (!tree) {
    return;
  }
  try {
    const source = editor.document.getText();
    const splitOpts = resolveSplitOptions(editor);

    const outcomes: CursorOutcome[] = editor.selections.map((sel) => {
      const node = findTarget(tree, toParserPoint(sel.active));
      if (!node) {
        return { kind: 'noTarget' };
      }
      return pick(node, source, splitOpts);
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
  );
}

export function deactivate(): void {}
