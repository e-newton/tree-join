import { SyntaxNode } from './parseSource';

type ElementsSource = { kind: 'named-children' };

export interface NodeTypeDescriptor {
  type: string;
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
  | 'export_clause';
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
