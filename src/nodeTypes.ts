import { SyntaxNode } from "./parseSource";

type ElementsSource = { kind: 'named-children' };

export interface NodeTypeDescriptor {
    type: string;
    openToken: string;
    closeToken: string;
    separator: string;
    bracketSpacing: boolean;
    elementsField: ElementsSource;
}

type SupportedNodeTypes = 'array' | 'object';
type SupportedSyntaxNode = SyntaxNode & { type: SupportedNodeTypes };

export const NODE_TYPES: Record<SupportedNodeTypes, NodeTypeDescriptor> = {
    array: {
        type: 'array',
        openToken: '[',
        closeToken: ']',
        separator: ',',
        bracketSpacing: false,
        elementsField: { kind: 'named-children' }
    },
    object: {
        type: 'object',
        openToken: '{',
        closeToken: '}',
        separator: ',',
        bracketSpacing: true,
        elementsField: { kind: 'named-children' }
    }
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