import * as vscode from 'vscode';
import { Language, Parser } from 'web-tree-sitter';
import { GRAMMAR_FILE, LANGUAGE_ID_TO_GRAMMAR } from './parseSource';
import type { GrammarKey } from './parseSource';

let extensionUri: vscode.Uri | undefined;
let runtimeInit: Promise<void> | undefined;
const parserByGrammar = new Map<GrammarKey, Promise<Parser>>();

export function initParser(context: vscode.ExtensionContext): void {
  extensionUri = context.extensionUri;
}

async function readWasm(filename: string): Promise<Uint8Array> {
  if (!extensionUri) {
    throw new Error('initParser must be called before loading WASM');
  }
  const uri = vscode.Uri.joinPath(extensionUri, 'dist', 'wasm', filename);
  return await vscode.workspace.fs.readFile(uri);
}

function ensureRuntime(): Promise<void> {
  if (!runtimeInit) {
    runtimeInit = (async () => {
      const wasmBinary = await readWasm('tree-sitter.wasm');
      await Parser.init({ wasmBinary });
    })().catch((err) => {
      runtimeInit = undefined;
      reportLoadFailure('runtime', err);
      throw err;
    });
  }
  return runtimeInit;
}

export async function parserFor(languageId: string): Promise<Parser | undefined> {
  const grammar = LANGUAGE_ID_TO_GRAMMAR[languageId];
  if (!grammar) return undefined;
  let pending = parserByGrammar.get(grammar);
  if (!pending) {
    pending = (async () => {
      await ensureRuntime();
      const bytes = await readWasm(GRAMMAR_FILE[grammar]);
      const language = await Language.load(bytes);
      const parser = new Parser();
      parser.setLanguage(language);
      return parser;
    })().catch((err) => {
      parserByGrammar.delete(grammar);
      reportLoadFailure(grammar, err);
      throw err;
    });
    parserByGrammar.set(grammar, pending);
  }
  return pending;
}

export async function getTree(
  document: vscode.TextDocument,
): Promise<import('web-tree-sitter').Tree | undefined> {
  const parser = await parserFor(document.languageId);
  if (!parser) return undefined;
  return parser.parse(document.getText()) ?? undefined;
}

function reportLoadFailure(what: string, err: unknown): void {
  console.error(`tree-join: failed to load ${what} WASM`, err);
  vscode.window.setStatusBarMessage(
    `tree-join: parser failed to load (${what})`,
    5000,
  );
}
