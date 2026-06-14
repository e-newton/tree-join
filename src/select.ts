import { isSupported } from './nodeTypes';
import { GrammarKey, Point, SyntaxNode, Tree } from './parseSource';

export function findTarget(
  tree: Tree,
  postion: Point,
  grammar: GrammarKey,
): SyntaxNode | undefined {
  let smallestNamedNode = tree.rootNode.descendantForPosition(postion);

  while (smallestNamedNode && !isSupported(smallestNamedNode, grammar)) {
    smallestNamedNode = smallestNamedNode.parent;
  }

  return smallestNamedNode ?? undefined;
}
