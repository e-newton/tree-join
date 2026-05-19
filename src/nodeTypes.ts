import { SyntaxNode } from './parseSource';

type SourceType = 'named-children' | 'jsx-element-children';

type ElementsSource = { kind: SourceType };

export interface NodeTypeDescriptor {
  type: SupportedNodeTypes;
  openToken: string;
  closeToken: string;
  separator: string;
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
  | 'jsx_self_closing_element';
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
    return node.children.filter(
      (childNode): childNode is SyntaxNode =>
        !!childNode && (childNode.isNamed || childNode.type === descriptor.separator),
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
