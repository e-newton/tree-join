import * as assert from 'node:assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'EricNewton.tree-join';
const COMMANDS = [
  'tree-join.toggle',
  'tree-join.join',
  'tree-join.split',
  'tree-join.splitRecursive',
  'tree-join.joinRecursive',
];

const SINGLE_LINE = 'const xs = [1, 2, 3];';
const MULTI_LINE = ['const xs = [', '  1,', '  2,', '  3,', '];'].join('\n');

async function openDoc(content: string, language = 'typescript'): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument({ content, language });
  const editor = await vscode.window.showTextDocument(doc);
  // Pin indentation so split output is deterministic regardless of the host's
  // default tabSize (untitled docs otherwise default to 4).
  editor.options = { tabSize: 2, insertSpaces: true };
  return editor;
}

/** Toggle/transform commands resolve a tree asynchronously; give the edit a beat to land. */
async function runCommand(command: string): Promise<void> {
  await vscode.commands.executeCommand(command);
  await new Promise((resolve) => setTimeout(resolve, 50));
}

suite('tree-join integration', () => {
  suiteTeardown(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  test('activates and registers all five commands', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `extension ${EXTENSION_ID} not found`);
    await ext.activate();
    assert.ok(ext.isActive, 'extension did not activate');

    const registered = await vscode.commands.getCommands(true);
    for (const command of COMMANDS) {
      assert.ok(registered.includes(command), `command not registered: ${command}`);
    }
  });

  test('toggle splits then joins back, preserving the cursor token', async () => {
    const editor = await openDoc(SINGLE_LINE);
    // Cursor on the `2` element of [1, 2, 3].
    const onTwo = new vscode.Position(0, SINGLE_LINE.indexOf('2'));
    editor.selection = new vscode.Selection(onTwo, onTwo);

    await runCommand('tree-join.toggle');
    assert.strictEqual(editor.document.getText(), MULTI_LINE, 'split text mismatch');
    // Cursor follows the `2` onto its own line.
    const split = editor.selection.active;
    assert.strictEqual(split.line, 2, `cursor line after split: ${split.line}`);
    assert.strictEqual(split.character, 2, `cursor char after split: ${split.character}`);

    await runCommand('tree-join.toggle');
    assert.strictEqual(editor.document.getText(), SINGLE_LINE, 'join text mismatch');
    const joined = editor.selection.active;
    assert.strictEqual(joined.line, 0, `cursor line after join: ${joined.line}`);
    assert.strictEqual(
      joined.character,
      SINGLE_LINE.indexOf('2'),
      `cursor char after join: ${joined.character}`,
    );
  });

  test('toggles a php array (php grammar activates and loads)', async () => {
    const single = '<?php $xs = [1, 2, 3];';
    const multi = ['<?php $xs = [', '  1,', '  2,', '  3,', '];'].join('\n');
    const editor = await openDoc(single, 'php');
    const onTwo = new vscode.Position(0, single.indexOf('2'));
    editor.selection = new vscode.Selection(onTwo, onTwo);

    await runCommand('tree-join.toggle');
    assert.strictEqual(editor.document.getText(), multi, 'php split text mismatch');

    await runCommand('tree-join.toggle');
    assert.strictEqual(editor.document.getText(), single, 'php join text mismatch');
  });

  test('toggles a json object (json grammar activates and loads)', async () => {
    const single = '{ "name": "x", "version": "1.0.0" }';
    const multi = ['{', '  "name": "x",', '  "version": "1.0.0"', '}'].join('\n');
    const editor = await openDoc(single, 'json');
    const onName = new vscode.Position(0, single.indexOf('"name"'));
    editor.selection = new vscode.Selection(onName, onName);

    await runCommand('tree-join.toggle');
    assert.strictEqual(editor.document.getText(), multi, 'json split text mismatch');

    await runCommand('tree-join.toggle');
    assert.strictEqual(editor.document.getText(), single, 'json join text mismatch');
  });

  test('multi-cursor toggle applies and undoes as one step', async () => {
    const content = ['const a = [1, 2, 3];', 'const b = [4, 5, 6];'].join('\n');
    const editor = await openDoc(content);
    editor.selections = [
      new vscode.Selection(new vscode.Position(0, 12), new vscode.Position(0, 12)),
      new vscode.Selection(new vscode.Position(1, 12), new vscode.Position(1, 12)),
    ];

    await runCommand('tree-join.toggle');
    const after = editor.document.getText();
    assert.ok(after.includes('const a = [\n'), 'first literal did not split');
    assert.ok(after.includes('const b = [\n'), 'second literal did not split');

    await vscode.commands.executeCommand('undo');
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.strictEqual(editor.document.getText(), content, 'single undo did not revert both edits');
  });

  // Regression: two cursors resolving into the same node used to emit two
  // overlapping edits in one WorkspaceEdit, shredding the document.
  test('two cursors in the same construct split it once', async () => {
    const editor = await openDoc(SINGLE_LINE);
    editor.selections = [
      new vscode.Selection(new vscode.Position(0, 12), new vscode.Position(0, 12)),
      new vscode.Selection(new vscode.Position(0, 15), new vscode.Position(0, 15)),
    ];

    await runCommand('tree-join.toggle');
    assert.strictEqual(editor.document.getText(), MULTI_LINE, 'duplicate targets did not collapse');
  });

  // The status-bar text itself is not readable through the VSCode API, so this
  // asserts the observable half: the command runs to completion in a language
  // with no grammar and leaves the document alone. Message wording and
  // formatting are covered by tests/unit/status.test.ts.
  test('a command in an unsupported language is a no-op, not a crash', async () => {
    const content = 'x = [1, 2, 3]';
    const editor = await openDoc(content, 'python');
    editor.selections = [
      new vscode.Selection(new vscode.Position(0, 6), new vscode.Position(0, 6)),
    ];

    await runCommand('tree-join.toggle');
    assert.strictEqual(editor.document.getText(), content, 'python document was modified');
  });

  // Regression: a cursor in a nested construct sits inside its parent's range,
  // so the inner edit used to be applied against stale offsets.
  test('cursors in nested constructs transform only the outermost', async () => {
    const editor = await openDoc('const xs = [1, [2, 3], 4];');
    editor.selections = [
      // Outer array, then inside the nested `[2, 3]`.
      new vscode.Selection(new vscode.Position(0, 12), new vscode.Position(0, 12)),
      new vscode.Selection(new vscode.Position(0, 16), new vscode.Position(0, 16)),
    ];

    await runCommand('tree-join.toggle');
    const expected = ['const xs = [', '  1,', '  [2, 3],', '  4,', '];'].join('\n');
    assert.strictEqual(editor.document.getText(), expected, 'nested targets did not collapse');
  });
});
