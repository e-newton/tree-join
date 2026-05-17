type ElementsSource = { kind: 'named-children' };

export interface NodeTypeDescriptor {
    type: string;
    openToken: string;
    closeToken: string;
    separator: string;
    bracketSpace: boolean;
    elementsField: ElementsSource;
}