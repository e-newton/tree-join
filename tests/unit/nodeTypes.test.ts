import { assert, describe, expect, it } from 'vitest';
import type { SyntaxNode, Tree } from '../../src/parseSource';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSource } from '../../src/parseSource';
import { descriptorFor, isSupported } from '../../src/nodeTypes';

const TYPESCRIPT_ARRAY = 'const x = [1, 2, 3]';
const TYPESCRIPT_OBJECT = 'const x = {a:1}';
const TYPESCRIPT_STRING = 'const x = "Hello World!"';
const TYPESCRIPT_ARGUMENTS = 'foo(1, 2, 3)';
const TYPESCRIPT_FORMAL_PARAMETERS = 'function f(a, b) {}';
const TYPESCRIPT_ARRAY_PATTERN = 'const [a, b] = xs';
const TYPESCRIPT_OBJECT_PATTERN = 'const { a, b } = obj';

function walkToNodeType(node: SyntaxNode, targetNodeType: string): SyntaxNode | undefined {
  if (node.type === targetNodeType) return node;

  for (const child of node.children) {
    if (!child) continue;

    const found = walkToNodeType(child, targetNodeType);
    if (found) return found;
  }

  return undefined;
}

describe('Node Types', () => {
  async function getTypescriptTree(source: string): Promise<Tree> {
    return await parseSource(source, 'typescript', async (filename: string) => {
      return readFileSync(join(__dirname, '../../wasm', filename));
    });
  }

  it('should be able to get type descriptor for typescript array', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_ARRAY);
    const arrayNode = walkToNodeType(tree.rootNode, 'array');

    if (!arrayNode) {
      assert.fail('Unable to find array node');
    }

    expect(isSupported(arrayNode)).toBe(true);
    expect(descriptorFor(arrayNode)).toBeDefined();
    expect(descriptorFor(arrayNode)?.openToken).toBe('[');
    expect(descriptorFor(arrayNode)?.closeToken).toBe(']');
    expect(descriptorFor(arrayNode)?.separator).toBe(',');
    expect(descriptorFor(arrayNode)?.bracketSpacing).toBe(false);
    expect(descriptorFor(arrayNode)?.elementsField).toEqual({ kind: 'named-children' });
  });
  it('should be able to get type descriptor for typescript object', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_OBJECT);
    const objectNode = walkToNodeType(tree.rootNode, 'object');

    if (!objectNode) {
      assert.fail('Unable to find object node');
    }

    expect(isSupported(objectNode)).toBe(true);
    expect(descriptorFor(objectNode)).toBeDefined();
    expect(descriptorFor(objectNode)?.openToken).toBe('{');
    expect(descriptorFor(objectNode)?.closeToken).toBe('}');
    expect(descriptorFor(objectNode)?.separator).toBe(',');
    expect(descriptorFor(objectNode)?.bracketSpacing).toBe(true);
    expect(descriptorFor(objectNode)?.elementsField).toEqual({ kind: 'named-children' });
  });
  it('should not be able to get type descriptor for typescript string', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_STRING);
    const stringNode = walkToNodeType(tree.rootNode, 'string');

    if (!stringNode) {
      assert.fail('Unable to find string node');
    }

    expect(isSupported(stringNode)).toBe(false);
    expect(descriptorFor(stringNode)).toBeUndefined();
  });
  it('should be able to get type descriptor for typescript arguments', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_ARGUMENTS);
    const argumentsNode = walkToNodeType(tree.rootNode, 'arguments');

    if (!argumentsNode) {
      assert.fail('Unable to find arguments node');
    }

    expect(isSupported(argumentsNode)).toBe(true);
    expect(descriptorFor(argumentsNode)).toBeDefined();
    expect(descriptorFor(argumentsNode)?.openToken).toBe('(');
    expect(descriptorFor(argumentsNode)?.closeToken).toBe(')');
    expect(descriptorFor(argumentsNode)?.separator).toBe(',');
    expect(descriptorFor(argumentsNode)?.bracketSpacing).toBe(false);
    expect(descriptorFor(argumentsNode)?.elementsField).toEqual({ kind: 'named-children' });
  });
  it('should be able to get type descriptor for typescript formal_parameters', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_FORMAL_PARAMETERS);
    const formalParametersNode = walkToNodeType(tree.rootNode, 'formal_parameters');

    if (!formalParametersNode) {
      assert.fail('Unable to find formal_parameters node');
    }

    expect(isSupported(formalParametersNode)).toBe(true);
    expect(descriptorFor(formalParametersNode)).toBeDefined();
    expect(descriptorFor(formalParametersNode)?.openToken).toBe('(');
    expect(descriptorFor(formalParametersNode)?.closeToken).toBe(')');
    expect(descriptorFor(formalParametersNode)?.separator).toBe(',');
    expect(descriptorFor(formalParametersNode)?.bracketSpacing).toBe(false);
    expect(descriptorFor(formalParametersNode)?.elementsField).toEqual({ kind: 'named-children' });
  });
  it('should be able to get type descriptor for typescript array_pattern', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_ARRAY_PATTERN);
    const arrayPatternNode = walkToNodeType(tree.rootNode, 'array_pattern');

    if (!arrayPatternNode) {
      assert.fail('Unable to find array_pattern node');
    }

    expect(isSupported(arrayPatternNode)).toBe(true);
    expect(descriptorFor(arrayPatternNode)).toBeDefined();
    expect(descriptorFor(arrayPatternNode)?.openToken).toBe('[');
    expect(descriptorFor(arrayPatternNode)?.closeToken).toBe(']');
    expect(descriptorFor(arrayPatternNode)?.separator).toBe(',');
    expect(descriptorFor(arrayPatternNode)?.bracketSpacing).toBe(false);
    expect(descriptorFor(arrayPatternNode)?.elementsField).toEqual({ kind: 'named-children' });
  });
  it('should be able to get type descriptor for typescript object_pattern', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_OBJECT_PATTERN);
    const objectPatternNode = walkToNodeType(tree.rootNode, 'object_pattern');

    if (!objectPatternNode) {
      assert.fail('Unable to find object_pattern node');
    }

    expect(isSupported(objectPatternNode)).toBe(true);
    expect(descriptorFor(objectPatternNode)).toBeDefined();
    expect(descriptorFor(objectPatternNode)?.openToken).toBe('{');
    expect(descriptorFor(objectPatternNode)?.closeToken).toBe('}');
    expect(descriptorFor(objectPatternNode)?.separator).toBe(',');
    expect(descriptorFor(objectPatternNode)?.bracketSpacing).toBe(true);
    expect(descriptorFor(objectPatternNode)?.elementsField).toEqual({ kind: 'named-children' });
  });
});
