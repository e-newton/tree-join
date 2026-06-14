import {
  descriptorFor,
  getChildren,
  getClosingToken,
  getOpeningToken,
  isLineComment,
  NodeTypeDescriptor,
  resolveSeparator,
  separatorsFor,
} from './nodeTypes';
import { GrammarKey, SyntaxNode } from './parseSource';
import { groupIntoRuns, Run } from './runs';
import { ElementOffsets, Range, TransformSuccess } from './types';

export type SplitOptions = {
  tabSize: number;
  insertSpaces: boolean;
  /** Trailing separator behavior on split. Undefined behaves like 'add'. */
  trailingComma?: 'add' | 'preserve' | 'never';
};

/**
 * Whether the last element should carry a trailing separator, per the
 * `trailingComma` setting. `add` (default) always emits one, `never` never
 * does, and `preserve` mirrors whether the source already had one. JSX
 * (whitespace-separated) is exempt and decided by the per-run `hasSeparator`.
 */
function emitTrailingSeparator(
  node: SyntaxNode,
  descriptor: NodeTypeDescriptor,
  mode: 'add' | 'preserve' | 'never',
): boolean {
  if (descriptor.forbidTrailingSeparator) return false;
  if (mode === 'add') return true;
  if (mode === 'never') return false;
  const separators = separatorsFor(descriptor);
  const children = getChildren(node, descriptor);
  const last = children.at(-1);
  return !!last && separators.includes(last.type);
}

export function splitNode(
  node: SyntaxNode,
  source: string,
  opts: SplitOptions,
  grammar: GrammarKey,
): TransformSuccess {
  const descriptor = descriptorFor(node, grammar);

  if (!descriptor) {
    throw new Error('Unable to split: node not supported');
  }

  const range: Range = {
    start: node.startPosition,
    startIndex: node.startIndex,
    end: node.endPosition,
    endIndex: node.endIndex,
  };

  const lineStart = node.startIndex - node.startPosition.column;
  const baseIndent = source.slice(lineStart, node.startIndex).match(/^\s*/)?.[0] ?? '';

  const childIndentTabString = baseIndent + (opts.insertSpaces ? ' '.repeat(opts.tabSize) : '\t');

  const elementRuns = getElementRuns(node, descriptor);

  if (elementRuns.length === 0) {
    return {
      newText: node.text,
      range,
      elements: [],
    };
  }

  const openingToken = getOpeningToken(node, descriptor);
  const firstElementOffsetInNewText = openingToken.length + 1; // openToken + '\n'
  const separator = resolveSeparator(node, descriptor);
  const trailingSeparator = emitTrailingSeparator(node, descriptor, opts.trailingComma ?? 'add');
  const { strings, elements } = buildElements(
    elementRuns,
    separator,
    source,
    childIndentTabString,
    firstElementOffsetInNewText,
    trailingSeparator,
    grammar,
  );

  const body = strings.join('\n');
  const paddedEnd = baseIndent + getClosingToken(node, descriptor);
  const finalString = openingToken + '\n' + body + '\n' + paddedEnd;

  return { newText: finalString, range, elements };
}

function getElementRuns(node: SyntaxNode, descriptor: NodeTypeDescriptor): Run[] {
  const children = getChildren(node, descriptor);

  if (descriptor.elementsField.kind === 'jsx-element-children') {
    return children.map((childNode) => ({ nodes: [childNode], hasSeparator: true }));
  }

  return groupIntoRuns(children, descriptor);
}

function buildElements(
  runs: Run[],
  separator: string,
  source: string,
  childIndentTabString: string,
  firstElementOffsetInNewText: number,
  trailingSeparator: boolean,
  grammar: GrammarKey,
): { strings: string[]; elements: ElementOffsets[] } {
  const strings: string[] = [];
  const elements: ElementOffsets[] = [];
  let offset = firstElementOffsetInNewText;

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (!run) continue;
    const isLast = i === runs.length - 1;
    const firstNode = run.nodes.at(0);
    const lastNode = run.nodes.at(-1);
    const content =
      firstNode && lastNode ? source.slice(firstNode.startIndex, lastNode.endIndex) : '';
    // A run ending in a line comment can never take a separator — it would land
    // inside the `//` comment. Any pre-existing separator is already captured in
    // the raw source slice above.
    const endsWithLineComment = !!lastNode && isLineComment(lastNode, grammar);
    // Interior elements always take the separator; the last element follows the
    // resolved trailingComma decision.
    const wantSeparator = (isLast ? trailingSeparator : true) && !endsWithLineComment;
    const sep = run.hasSeparator || !wantSeparator ? '' : separator;
    const line = childIndentTabString + content + sep;

    if (firstNode && lastNode) {
      const contentStart = offset + childIndentTabString.length;
      elements.push({
        originalStart: firstNode.startIndex,
        originalEnd: lastNode.endIndex,
        newStart: contentStart,
        newEnd: contentStart + content.length,
      });
    }

    strings.push(line);
    offset += line.length + 1; // +1 for the '\n' joining element lines
  }

  return { strings, elements };
}
