import * as vscode from 'vscode';
import { getTree, initParser } from './parser';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  initParser(context);

  const helloWorld = vscode.commands.registerCommand('tree-join.helloWorld', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.setStatusBarMessage('tree-join: open a TS/JS file to test', 3000);
      return;
    }
    const tree = await getTree(editor.document);
    if (!tree) {
      vscode.window.setStatusBarMessage('tree-join: open a TS/JS file to test', 3000);
      return;
    }
    try {
      const root = tree.rootNode;
      vscode.window.setStatusBarMessage(
        `tree-join: parsed ${root.type} (${root.childCount} children)`,
        3000,
      );
    } finally {
      tree.delete();
    }
  });
  context.subscriptions.push(helloWorld);
}

export function deactivate(): void {}
