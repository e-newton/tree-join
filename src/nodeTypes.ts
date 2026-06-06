import { SyntaxNode } from './parseSource';

type SourceType = 'named-children' | 'jsx-element-children';

type ElementsSource = { kind: SourceType };

export interface NodeTypeDescriptor {
  type: SupportedNodeTypes;
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
}

type SupportedNodeTypes =
  | 'array'
  | 'object'
  | 'arguments'
  | 'formal_parameters'
  | 'array_pattern'
  | 'object_pattern'
  | 'named_imports'
  | 'export_clause'
  | 'jsx_opening_element'
  | 'jsx_self_closing_element'
  | 'type_arguments'
  | 'type_parameters'
  | 'tuple_type'
  | 'object_type';
type SupportedSyntaxNode = SyntaxNode & { type: SupportedNodeTypes };

export const NODE_TYPES: Record<SupportedNodeTypes, NodeTypeDescriptor> = {
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
} as const;

export function isSupported(node: SyntaxNode): node is SupportedSyntaxNode {
  return node.type in NODE_TYPES;
}

export function descriptorFor(node: SyntaxNode): NodeTypeDescriptor | undefined {
  if (isSupported(node)) {
    return NODE_TYPES[node.type];
  }

  return undefined;
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
    return descriptor.openToken;
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
