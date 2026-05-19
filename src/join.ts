import { descriptorFor, getChildren, getOpeningToken, NodeTypeDescriptor } from './nodeTypes';
import { SyntaxNode } from './parseSource';
import { groupIntoRuns } from './runs';
import { ElementOffsets, Range, TransformResult } from './types';

export type JoinOptions = {
  maxJoinLength?: number;
};

export function joinNode(node: SyntaxNode, source: string, opts: JoinOptions): TransformResult {
  const descriptor = descriptorFor(node);

  if (!descriptor) {
    throw new Error('Unable to join: node not supported');
  }

  if (descriptor.elementsField.kind === 'jsx-element-children') {
    return joinJsxAttributes(node, descriptor, source, opts);
  }

  const range = rangeOf(node);
  const children = getChildren(node, descriptor);

  if (children.some(isLineComment)) {
    return { refused: 'lineComment' };
  }

  const runs = groupIntoRuns(children, descriptor);

  if (!runs.length) {
    return { newText: node.text, range, elements: [] };
  }

  const padding = descriptor.bracketSpacing ? ' ' : '';
  const elements: ElementOffsets[] = [];
  const contentParts: string[] = [];
  let offset = descriptor.openToken.length + padding.length;

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (!run) continue;
    const firstNode = run.nodes.at(0);
    const lastNode = run.nodes.at(-1);
    const content = run.nodes.map((n) => n.text).join(' ');

    if (firstNode && lastNode) {
      elements.push({
        originalStart: firstNode.startIndex,
        originalEnd: lastNode.endIndex,
        newStart: offset,
        newEnd: offset + content.length,
      });
    }

    contentParts.push(content);
    offset += content.length;
    if (i < runs.length - 1) offset += 2; // ', '
  }

  const body = padding + contentParts.join(', ') + padding;
  const newText = descriptor.openToken + body + descriptor.closeToken;

  if (exceedsMaxLineLength(newText, node, source, opts.maxJoinLength)) {
    return { refused: 'width' };
  }

  return { newText, range, elements };
}

function joinJsxAttributes(
  node: SyntaxNode,
  descriptor: NodeTypeDescriptor,
  source: string,
  opts: JoinOptions,
): TransformResult {
  const range = rangeOf(node);
  const attributes = getChildren(node, descriptor);

  if (attributes.some(containsLineComment)) {
    return { refused: 'lineComment' };
  }

  const openingText = getOpeningToken(node, descriptor); // `<TagName`

  if (attributes.length === 0) {
    return { newText: node.text, range, elements: [] };
  }

  const leftPad = ' ';
  const rightPad = computeJsxRightPad(node);

  const elements: ElementOffsets[] = [];
  let offset = openingText.length + leftPad.length;
  const attrTexts: string[] = [];

  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    if (!attr) continue;
    const text = attr.text;
    elements.push({
      originalStart: attr.startIndex,
      originalEnd: attr.endIndex,
      newStart: offset,
      newEnd: offset + text.length,
    });
    attrTexts.push(text);
    offset += text.length;
    if (i < attributes.length - 1) offset += 1; // single-space separator
  }

  const newText = openingText + leftPad + attrTexts.join(' ') + rightPad + descriptor.closeToken;

  if (exceedsMaxLineLength(newText, node, source, opts.maxJoinLength)) {
    return { refused: 'width' };
  }

  return { newText, range, elements };
}

function computeJsxRightPad(node: SyntaxNode): string {
  if (node.type === 'jsx_self_closing_element') {
    return ' ';
  }
  const parent = node.parent;
  const hasBodyChildren = !!parent && parent.type === 'jsx_element' && parent.childCount > 2;
  return hasBodyChildren ? '' : ' ';
}

function rangeOf(node: SyntaxNode): Range {
  return {
    start: node.startPosition,
    startIndex: node.startIndex,
    end: node.endPosition,
    endIndex: node.endIndex,
  };
}

function isLineComment(node: SyntaxNode): boolean {
  return node.type === 'comment' && node.text.startsWith('//');
}

function containsLineComment(node: SyntaxNode): boolean {
  if (isLineComment(node)) return true;
  for (const child of node.children) {
    if (child && containsLineComment(child)) return true;
  }
  return false;
}

function exceedsMaxLineLength(
  newText: string,
  node: SyntaxNode,
  source: string,
  maxJoinLength: number | undefined,
): boolean {
  if (maxJoinLength === undefined) return false;
  const startText = source.slice(node.startIndex - node.startPosition.column, node.startIndex);
  const nlIdx = source.indexOf('\n', node.endIndex);
  const endText = source.slice(node.endIndex, nlIdx === -1 ? source.length : nlIdx);
  return (startText + newText + endText).length > maxJoinLength;
}
