import { Language, Parser } from 'web-tree-sitter';

export type { Node as SyntaxNode, Point, Tree } from 'web-tree-sitter';

export type GrammarKey = 'typescript' | 'tsx';

export const LANGUAGE_ID_TO_GRAMMAR: Record<string, GrammarKey> = {
  typescript: 'typescript',
  javascript: 'typescript',
  typescriptreact: 'tsx',
  javascriptreact: 'tsx',
};

export const GRAMMAR_FILE: Record<GrammarKey, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
};

export async function parseSource(
  source: string,
  languageId: string,
  loadWasm: (filename: string) => Promise<Uint8Array>
): Promise<import('web-tree-sitter').Tree> {
  // Load the tree sitter web assembly
  const runtimeBytes = await loadWasm('tree-sitter.wasm');
  await Parser.init({ wasmBinary: runtimeBytes });

  // Load the specific language parser
  const grammarKey = LANGUAGE_ID_TO_GRAMMAR[languageId];
  if (!grammarKey) throw new Error(`Unsupported Language: ${languageId}`);
  const grammarBytes = await loadWasm(GRAMMAR_FILE[grammarKey]);
  const language = await Language.load(grammarBytes);

  // Init concrete parser
  const parser = new Parser();
  parser.setLanguage(language);

  // Parse the source code passed in
  const tree = parser.parse(source);
  if (!tree) throw new Error('Parse Failed');
  return tree;
}
