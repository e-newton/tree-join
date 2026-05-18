import { isSupported } from './nodeTypes';
import { Point, SyntaxNode, Tree } from './parseSource';

export function findTarget(tree: Tree, postion: Point): SyntaxNode | undefined {
  let smallestNamedNode = tree.rootNode.descendantForPosition(postion);

  while (smallestNamedNode && !isSupported(smallestNamedNode)) {
    smallestNamedNode = smallestNamedNode.parent;
  }

  return smallestNamedNode ?? undefined;
}
