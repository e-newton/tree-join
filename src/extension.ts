import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const helloWorld = vscode.commands.registerCommand('tree-join.helloWorld', () => {
    vscode.window.setStatusBarMessage('tree-join: hello world', 3000);
  });
  context.subscriptions.push(helloWorld);
}

export function deactivate(): void {}
