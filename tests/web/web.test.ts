import * as vscode from 'vscode';

// Browser worker has no `node:assert`; use a tiny local assert.
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const EXTENSION_ID = 'EricNewton.tree-join';
const COMMANDS = [
  'tree-join.toggle',
  'tree-join.join',
  'tree-join.split',
  'tree-join.splitRecursive',
  'tree-join.joinRecursive',
];

async function openDoc(content: string, language: string): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  const editor = await vscode.window.showTextDocument(doc);
  // Deterministic split indentation regardless of host defaults.
  editor.options = { tabSize: 2, insertSpaces: true };
  return editor;
}

/** Place the cursor at the first occurrence of `marker` inside `content`. */
function cursorAt(editor: vscode.TextEditor, marker: string): void {
  const offset = editor.document.getText().indexOf(marker);
  assert(offset >= 0, `marker not found: ${marker}`);
  const pos = editor.document.positionAt(offset);
  editor.selection = new vscode.Selection(pos, pos);
}

async function toggle(): Promise<void> {
  await vscode.commands.executeCommand('tree-join.toggle');
  // The transform parses asynchronously; give the edit a beat to land.
  await new Promise((r) => setTimeout(r, 60));
}

/**
 * A single-line construct should split (gain a newline) on the first toggle and
 * round-trip back to the exact original on the second. Round-trip equality
 * exercises the full split+join path without hard-coding indentation per case.
 */
async function roundTrip(content: string, language: string, cursorMarker: string): Promise<void> {
  const editor = await openDoc(content, language);
  cursorAt(editor, cursorMarker);

  await toggle();
  const split = editor.document.getText();
  assert(split !== content, `did not split: ${content}`);
  assert(split.includes('\n  '), `split produced no indented line: ${content}`);

  await toggle();
  const joined = editor.document.getText();
  assert(joined === content, `round-trip mismatch.\n  expected: ${content}\n  actual:   ${joined}`);
}

suite('tree-join web smoke', () => {
  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('activates and registers all five commands in the web host', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert(ext, `extension ${EXTENSION_ID} not found`);
    await ext.activate();
    assert(ext.isActive, 'extension did not activate');

    const registered = await vscode.commands.getCommands(true);
    for (const command of COMMANDS) {
      assert(registered.includes(command), `command not registered: ${command}`);
    }
  });

  // The following round-trips all hit tree-sitter-typescript.wasm, proving the
  // TS grammar loads in the browser worker.
  test('array literal round-trips', async () => {
    await roundTrip('const xs = [1, 2, 3];', 'typescript', '2');
  });

  test('object literal round-trips', async () => {
    await roundTrip('const o = { a: 1, b: 2 };', 'typescript', 'a: 1');
  });

  test('named import round-trips', async () => {
    await roundTrip('import { a, b, c } from "mod";', 'typescript', 'b,');
  });

  test('object type round-trips', async () => {
    await roundTrip('type T = { a: string; b: number };', 'typescript', 'a: string');
  });

  // This round-trip hits tree-sitter-tsx.wasm, proving the TSX grammar also
  // loads in the browser worker.
  test('jsx attribute list round-trips', async () => {
    await roundTrip('const el = <Foo a={1} b={2} />;', 'typescriptreact', 'a={1}');
  });
});
