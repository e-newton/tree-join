import * as vscode from 'vscode';
import { TransformResult, TransformSuccess } from './types';
import { toVsCodeRange } from './helpers';
import { mapCursorOffsets } from './cursor';

function isSuccess(result: TransformResult): result is TransformSuccess {
  return 'newText' in result;
}

export async function applyTransforms(
  editor: vscode.TextEditor,
  results: TransformResult[],
): Promise<void> {
  const successfulResults = results.filter(isSuccess);
  if (!successfulResults.length) {
    return;
  }

  const document = editor.document;
  const originalOffsets = editor.selections.map((sel) => document.offsetAt(sel.active));
  const newOffsets = mapCursorOffsets(successfulResults, originalOffsets);

  const edit = new vscode.WorkspaceEdit();
  successfulResults.forEach((result) =>
    edit.replace(document.uri, toVsCodeRange(result.range), result.newText),
  );

  await vscode.workspace.applyEdit(edit);

  editor.selections = newOffsets.map((offset) => {
    const pos = document.positionAt(offset);
    return new vscode.Selection(pos, pos);
  });
}
