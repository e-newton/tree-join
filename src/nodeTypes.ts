import { GrammarKey, SyntaxNode } from './parseSource';

type SourceType = 'named-children' | 'jsx-element-children';

type ElementsSource = { kind: SourceType };

export interface NodeTypeDescriptor {
  /** The tree-sitter node type this descriptor matches (its table key). */
  type: string;
  openToken: string;
  closeToken: string;
  /** Canonical separator to emit when none can be detected in the node. */
  separator: string;
  /**
   * Tokens that count as element separators when grouping/matching children.
   * Defaults to `[separator]`. `object_type` accepts both `;` and `,`.
   */
  separators?: string[];
  bracketSpacing: boolean;
  elementsField: ElementsSource;
  /**
   * Suppress the trailing separator on split regardless of the `trailingComma`
   * setting, for constructs where one is a syntax error (e.g. a PHP group-use
   * list: `use Foo\{A, B}` cannot be written `use Foo\{A, B,}`).
   */
  forbidTrailingSeparator?: boolean;
  /**
   * Some constructs have more than one surface form with different brackets
   * (e.g. PHP `[...]` vs `array(...)`, both `array_creation_expression`). When
   * set, the open/close delimiters are resolved per node from this function
   * instead of the static `openToken`/`closeToken` (which remain the fallback).
   */
  delimiters?: (node: SyntaxNode) => { open: string; close: string };
}

/** A per-grammar map from tree-sitter node type to its descriptor. */
export type DescriptorTable = Record<string, NodeTypeDescriptor>;

/**
 * TypeScript / TSX constructs. Both grammars share one table: the `typescript`
 * grammar simply never produces the JSX node types, and TSX is a superset.
 */
const TS_NODE_TYPES: DescriptorTable = {
  array: {
    type: 'array',
    openToken: '[',
    closeToken: ']',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  object: {
    type: 'object',
    openToken: '{',
    closeToken: '}',
    separator: ',',
    bracketSpacing: true,
    elementsField: { kind: 'named-children' },
  },
  arguments: {
    type: 'arguments',
    openToken: '(',
    closeToken: ')',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  formal_parameters: {
    type: 'formal_parameters',
    openToken: '(',
    closeToken: ')',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  array_pattern: {
    type: 'array_pattern',
    openToken: '[',
    closeToken: ']',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  object_pattern: {
    type: 'object_pattern',
    openToken: '{',
    closeToken: '}',
    separator: ',',
    bracketSpacing: true,
    elementsField: { kind: 'named-children' },
  },
  named_imports: {
    type: 'named_imports',
    openToken: '{',
    closeToken: '}',
    separator: ',',
    bracketSpacing: true,
    elementsField: { kind: 'named-children' },
  },
  export_clause: {
    type: 'export_clause',
    openToken: '{',
    closeToken: '}',
    separator: ',',
    bracketSpacing: true,
    elementsField: { kind: 'named-children' },
  },
  jsx_opening_element: {
    type: 'jsx_opening_element',
    openToken: '<',
    closeToken: '>',
    separator: ' ',
    bracketSpacing: true,
    elementsField: { kind: 'jsx-element-children' },
  },
  jsx_self_closing_element: {
    type: 'jsx_self_closing_element',
    openToken: '<',
    closeToken: '/>',
    separator: ' ',
    bracketSpacing: true,
    elementsField: { kind: 'jsx-element-children' },
  },
  type_arguments: {
    type: 'type_arguments',
    openToken: '<',
    closeToken: '>',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  type_parameters: {
    type: 'type_parameters',
    openToken: '<',
    closeToken: '>',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  tuple_type: {
    type: 'tuple_type',
    openToken: '[',
    closeToken: ']',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  object_type: {
    type: 'object_type',
    openToken: '{',
    closeToken: '}',
    separator: ';',
    separators: [';', ','],
    bracketSpacing: true,
    elementsField: { kind: 'named-children' },
  },
};

/** PHP constructs. */
const PHP_NODE_TYPES: DescriptorTable = {
  // Both `[1, 2]` and the legacy `array(1, 2)` parse to this node; the brackets
  // differ, so they are resolved per node via `delimiters`.
  array_creation_expression: {
    type: 'array_creation_expression',
    openToken: '[',
    closeToken: ']',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
    delimiters: (node) =>
      node.children[0]?.type === '[' ? { open: '[', close: ']' } : { open: 'array(', close: ')' },
  },
  arguments: {
    type: 'arguments',
    openToken: '(',
    closeToken: ')',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  formal_parameters: {
    type: 'formal_parameters',
    openToken: '(',
    closeToken: ')',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
  },
  // Group `use Foo\{A, B};` import list — the PHP analogue of `named_imports`.
  namespace_use_group: {
    type: 'namespace_use_group',
    openToken: '{',
    closeToken: '}',
    separator: ',',
    bracketSpacing: false,
    elementsField: { kind: 'named-children' },
    forbidTrailingSeparator: true,
  },
  // `match (x) { 1 => 'a', default => 'b' }` arm list.
  match_block: {
    type: 'match_block',
    openToken: '{',
    closeToken: '}',
    separator: ',',
    bracketSpacing: true,
    elementsField: { kind: 'named-children' },
  },
};

/**
 * The descriptor table for every supported grammar. Adding a language means
 * adding its grammar key here (and a `*_NODE_TYPES` table); the transforms are
 * generic over the descriptors, so no transform code changes per language.
 */
export const NODE_TYPES_BY_GRAMMAR: Record<GrammarKey, DescriptorTable> = {
  typescript: TS_NODE_TYPES,
  tsx: TS_NODE_TYPES,
  php: PHP_NODE_TYPES,
};

/** The descriptor table for a grammar (empty if the grammar is unknown). */
export function descriptorsFor(grammar: GrammarKey): DescriptorTable {
  return NODE_TYPES_BY_GRAMMAR[grammar] ?? {};
}

/**
 * Per-grammar line-comment prefixes. A "line comment" runs to end of line, so
 * joining a construct that contains one would swallow following code — hence the
 * join guard. Block comments have a closing delimiter (a join keeps them inline)
 * and are not listed. Note `#` is a line comment in PHP but a private-field
 * sigil in TS, so this is grammar-bound.
 */
const LINE_COMMENT_PREFIXES: Record<GrammarKey, string[]> = {
  typescript: ['//'],
  tsx: ['//'],
  php: ['//', '#'],
};

/** Whether `node` is a line comment in `grammar` (would be swallowed by a join). */
export function isLineComment(node: SyntaxNode, grammar: GrammarKey): boolean {
  if (node.type !== 'comment') return false;
  return (LINE_COMMENT_PREFIXES[grammar] ?? ['//']).some((p) => node.text.startsWith(p));
}

export function isSupported(node: SyntaxNode, grammar: GrammarKey): boolean {
  return node.type in descriptorsFor(grammar);
}

export function descriptorFor(
  node: SyntaxNode,
  grammar: GrammarKey,
): NodeTypeDescriptor | undefined {
  return descriptorsFor(grammar)[node.type];
}

/** Tokens that count as element separators for this node type. */
export function separatorsFor(descriptor: NodeTypeDescriptor): string[] {
  return descriptor.separators ?? [descriptor.separator];
}

/**
 * The separator to emit for this node. Uses the first separator token actually
 * present among the node's direct children (preserving the author's choice and
 * normalizing a mixed node), falling back to the descriptor's canonical
 * separator when none is present (e.g. a single-element or empty node).
 */
export function resolveSeparator(node: SyntaxNode, descriptor: NodeTypeDescriptor): string {
  const accepted = separatorsFor(descriptor);
  for (const child of node.children) {
    if (child && accepted.includes(child.type)) {
      return child.type;
    }
  }
  return descriptor.separator;
}

export function getOpeningToken(node: SyntaxNode, descriptor: NodeTypeDescriptor): string {
  if (descriptor.elementsField.kind === 'named-children') {
    return descriptor.delimiters ? descriptor.delimiters(node).open : descriptor.openToken;
  }

  if (descriptor.elementsField.kind === 'jsx-element-children') {
    const identifier = node.namedChildren.find(
      (c) => !!c && ['identifier', 'member_expression', 'jsx_namespace_name'].includes(c.type),
    );
    if (!identifier) {
      throw new Error(`JSX element ${node.type} has no tag identifier`);
    }
    return descriptor.openToken + identifier.text;
  }

  return '';
}

/**
 * The closing delimiter to emit for this node. Mirrors `getOpeningToken`:
 * resolved per node when the descriptor defines `delimiters`, else the static
 * `closeToken` (JSX has no `delimiters`, so it always uses `closeToken`).
 */
export function getClosingToken(node: SyntaxNode, descriptor: NodeTypeDescriptor): string {
  return descriptor.delimiters ? descriptor.delimiters(node).close : descriptor.closeToken;
}

export function getChildren(node: SyntaxNode, descriptor: NodeTypeDescriptor): SyntaxNode[] {
  if (descriptor.elementsField.kind === 'named-children') {
    const separators = separatorsFor(descriptor);
    return node.children.filter(
      (childNode): childNode is SyntaxNode =>
        !!childNode && (childNode.isNamed || separators.includes(childNode.type)),
    );
  }

  if (descriptor.elementsField.kind === 'jsx-element-children') {
    return node.children.filter(
      (childNode): childNode is SyntaxNode =>
        !!childNode &&
        ![
          'identifier',
          'member_expression',
          'jsx_namespace_name',
          descriptor.openToken,
          descriptor.closeToken,
        ].includes(childNode.type),
    );
  }

  return [];
}
