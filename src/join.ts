import { descriptorFor, NodeTypeDescriptor } from './nodeTypes';
import { SyntaxNode } from './parseSource';
import { ElementOffsets, Range, TransformResult } from './types';

export type JoinOptions = {
  maxJoinLength?: number;
};

type Run = {
  nodes: SyntaxNode[];
};

export function joinNode(node: SyntaxNode, source: string, opts: JoinOptions): TransformResult {
  const descriptor = descriptorFor(node);

  if (!descriptor) {
    throw new Error('Unable to join: node not supported');
  }

  const range: Range = {
    start: node.startPosition,
    startIndex: node.startIndex,
    end: node.endPosition,
    endIndex: node.endIndex,
  };

  const runs: Run[] = [];

  let seenOpenToken = false;
  let expectingElement = true;
  let pendingTrailingComment = false;
  let lastPushedToken: SyntaxNode | null = null;
  let currentRun: Run = {
    nodes: [],
  };

  const children = getChildren(node, descriptor);

  for (const childNode of children) {
    if (!childNode) continue;

    if (!seenOpenToken) {
      if (childNode.type === descriptor.openToken) {
        seenOpenToken = true;
      }
      continue;
    }

    if (childNode.type === 'comment' && childNode.text.startsWith('//')) {
      return {
        refused: 'lineComment',
      };
    }

    if (childNode.type === descriptor.closeToken) {
      if (!expectingElement) {
        runs.push(currentRun);
      }
      break;
    }

    if (childNode.type === descriptor.separator) {
      if (expectingElement) {
        runs.push({ nodes: [] });
      } else {
        pendingTrailingComment = true;
        runs.push(currentRun);
        currentRun = { nodes: [] };
        expectingElement = true;
      }
      continue;
    }

    const lastRun = runs.at(-1);
    if (
      lastRun &&
      pendingTrailingComment &&
      lastPushedToken &&
      childNode.type === 'comment' &&
      childNode.startPosition.row === lastPushedToken.endPosition.row
    ) {
      lastRun.nodes.push(childNode);
      pendingTrailingComment = false;
      continue;
    }

    pendingTrailingComment = false;
    currentRun.nodes.push(childNode);
    expectingElement = false;
    lastPushedToken = childNode;
  }

  if (!runs.length) {
    return {
      newText: node.text,
      range,
      elements: [],
    };
  }

  const elements: ElementOffsets[] = [];
  let offset = descriptor.openToken.length + (descriptor.bracketSpacing ? 1 : 0);
  const contentParts: string[] = [];

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

  let body = contentParts.join(', ');
  if (descriptor.bracketSpacing) {
    body = ' ' + body + ' ';
  }

  const newText = descriptor.openToken + body + descriptor.closeToken;

  if (opts.maxJoinLength !== undefined) {
    const startText = source.slice(node.startIndex - node.startPosition.column, node.startIndex);
    const nlIdx = source.indexOf('\n', node.endIndex);
    const endText = source.slice(node.endIndex, nlIdx === -1 ? source.length : nlIdx);
    if ((startText + newText + endText).length > opts.maxJoinLength) {
      return {
        refused: 'width',
      };
    }
  }

  return { newText, range, elements };
}

function getChildren(node: SyntaxNode, descriptor: NodeTypeDescriptor): SyntaxNode[] {
  if (descriptor.elementsField.kind === 'named-children') {
    return node.children.filter((c) => !!c);
  }

  if (descriptor.elementsField.kind === 'jsx-element-children') {
    return node.children.filter(
      (childNode): childNode is SyntaxNode => !!childNode && childNode.type === 'jsx_attribute',
    );
  }

  return [];
}
