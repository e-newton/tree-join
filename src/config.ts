import * as vscode from 'vscode';
import { SplitOptions } from './split';
import { JoinOptions } from './join';
import { normalizeRulers, resolveMaxJoinLength, TrailingComma } from './configResolve';

function tabOptions(editor: vscode.TextEditor): Pick<SplitOptions, 'tabSize' | 'insertSpaces'> {
  const { tabSize, insertSpaces } = editor.options;
  return {
    tabSize: typeof tabSize === 'number' ? tabSize : 2,
    insertSpaces: typeof insertSpaces === 'boolean' ? insertSpaces : true,
  };
}

export function splitOptionsFor(editor: vscode.TextEditor): SplitOptions {
  const config = vscode.workspace.getConfiguration('tree-join', editor.document);
  return {
    ...tabOptions(editor),
    trailingComma: config.get<TrailingComma>('trailingComma', 'preserve'),
  };
}

export function joinOptionsFor(editor: vscode.TextEditor): JoinOptions {
  const treeJoin = vscode.workspace.getConfiguration('tree-join', editor.document);
  const editorConfig = vscode.workspace.getConfiguration('editor', editor.document);
  const rulers = normalizeRulers(editorConfig.get('rulers'));
  return {
    maxJoinLength: resolveMaxJoinLength(treeJoin.get<number>('maxJoinLength', 100), rulers),
    bracketSpacing: treeJoin.get<boolean>('bracketSpacing', true),
  };
}
