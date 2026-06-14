import { joinNode, JoinOptions } from './join';
import { descriptorFor, getChildren, isSupported } from './nodeTypes';
import { GrammarKey, SyntaxNode, Tree } from './parseSource';
import { groupIntoRuns } from './runs';
import { findTarget } from './select';
import { splitNode, SplitOptions } from './split';
import { Range, TransformResult, TransformSuccess } from './types';

/** Synchronous re-parse of a working source string. */
export type Reparse = (text: string) => Tree;

function rangeOf(node: SyntaxNode): Range {
  return {
    start: node.startPosition,
    startIndex: node.startIndex,
    end: node.endPosition,
    endIndex: node.endIndex,
  };
}

function isSingleLine(node: SyntaxNode): boolean {
  return node.startPosition.row === node.endPosition.row;
}

function contains(outer: SyntaxNode, inner: SyntaxNode): boolean {
  return (
    outer.startIndex <= inner.startIndex &&
    inner.endIndex <= outer.endIndex &&
    !(outer.startIndex === inner.startIndex && outer.endIndex === inner.endIndex)
  );
}

/** Number of elements in a supported node (skip rule: 1 = single-element). */
function elementCount(node: SyntaxNode, grammar: GrammarKey): number {
  const descriptor = descriptorFor(node, grammar);
  if (!descriptor) return 0;
  const children = getChildren(node, descriptor);
  if (descriptor.elementsField.kind === 'jsx-element-children') {
    return children.length;
  }
  return groupIntoRuns(children, descriptor).filter((run) => run.nodes.length > 0).length;
}

/** Supported nodes within (and including) `node`, in pre-order. */
function collectSupported(node: SyntaxNode, grammar: GrammarKey): SyntaxNode[] {
  const out: SyntaxNode[] = [];
  const visit = (n: SyntaxNode): void => {
    if (isSupported(n, grammar)) out.push(n);
    for (const child of n.children) {
      if (child) visit(child);
    }
  };
  visit(node);
  return out;
}

/** Re-resolve the original target in a freshly parsed working tree. */
function findAnchored(tree: Tree, target: SyntaxNode, grammar: GrammarKey): SyntaxNode | undefined {
  return findTarget(tree, target.startPosition, grammar);
}

/**
 * Split the target and every supported descendant (depth-first, outer-first).
 * Single-element nodes are skipped (the wrapper stays inline; recursion still
 * descends into the lone element). Always expands — width never gates a split.
 */
export function splitRecursive(
  target: SyntaxNode,
  source: string,
  opts: SplitOptions,
  reparse: Reparse,
  grammar: GrammarKey,
): TransformSuccess {
  const originalRange = rangeOf(target);
  let working = source;
  let finalText = target.text;

  for (;;) {
    const tree = reparse(working);
    try {
      const current = findAnchored(tree, target, grammar);
      if (!current) break;

      // Pre-order: the target itself comes first, so the outer splits before
      // its descendants and each descendant re-indents off the fresh parse.
      const node = collectSupported(current, grammar).find(
        (n) => isSingleLine(n) && elementCount(n, grammar) >= 2,
      );

      if (!node) {
        finalText = current.text;
        break;
      }

      const result = splitNode(node, working, opts, grammar);
      working = working.slice(0, node.startIndex) + result.newText + working.slice(node.endIndex);
    } finally {
      tree.delete();
    }
  }

  return { newText: finalText, range: originalRange, elements: [] };
}

/**
 * Join the target and every supported descendant (innermost-first, outer last).
 * Width is enforced only on the final outer line (it contains every inner line);
 * a refusal anywhere — line comment, or width on the outer — aborts the whole
 * operation with that refusal code.
 */
export function joinRecursive(
  target: SyntaxNode,
  source: string,
  opts: JoinOptions,
  reparse: Reparse,
  grammar: GrammarKey,
): TransformResult {
  const originalRange = rangeOf(target);
  let working = source;
  let finalText = target.text;

  for (;;) {
    const tree = reparse(working);
    try {
      const current = findAnchored(tree, target, grammar);
      if (!current) break;

      const node = innermostMultiLine(current, grammar);
      if (!node) {
        finalText = current.text;
        break;
      }

      const isOuter = node.startIndex === current.startIndex && node.endIndex === current.endIndex;
      const result = joinNode(
        node,
        working,
        {
          maxJoinLength: isOuter ? opts.maxJoinLength : undefined,
        },
        grammar,
      );

      if ('refused' in result) {
        return result;
      }

      working = working.slice(0, node.startIndex) + result.newText + working.slice(node.endIndex);
    } finally {
      tree.delete();
    }
  }

  return { newText: finalText, range: originalRange, elements: [] };
}

/** A multi-line supported node that contains no other multi-line supported node. */
function innermostMultiLine(target: SyntaxNode, grammar: GrammarKey): SyntaxNode | undefined {
  const candidates = collectSupported(target, grammar).filter((n) => !isSingleLine(n));
  return candidates.find((n) => !candidates.some((m) => m !== n && contains(n, m)));
}
