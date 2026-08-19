import { assert, describe, expect, it } from 'vitest';
import type { SyntaxNode, Tree } from '../../src/parseSource';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LANGUAGE_ID_TO_GRAMMAR, parseSource } from '../../src/parseSource';
import {
  descriptorFor,
  getClosingToken,
  getOpeningToken,
  isLineComment,
  isSupported,
  resolveSeparator,
  separatorsFor,
} from '../../src/nodeTypes';

const TYPESCRIPT_ARRAY = 'const x = [1, 2, 3]';
const TYPESCRIPT_OBJECT = 'const x = {a:1}';
const TYPESCRIPT_STRING = 'const x = "Hello World!"';
const TYPESCRIPT_ARGUMENTS = 'foo(1, 2, 3)';
const TYPESCRIPT_FORMAL_PARAMETERS = 'function f(a, b) {}';
const TYPESCRIPT_ARRAY_PATTERN = 'const [a, b] = xs';
const TYPESCRIPT_OBJECT_PATTERN = 'const { a, b } = obj';
const TYPESCRIPT_TYPE_ARGUMENTS = 'const x: Foo<A, B> = bar';
const TYPESCRIPT_TYPE_PARAMETERS = 'function foo<T, U>() {}';
const TYPESCRIPT_TUPLE_TYPE = 'type X = [a: string, b: number]';

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

    expect(isSupported(arrayNode, 'typescript')).toBe(true);
    expect(descriptorFor(arrayNode, 'typescript')).toBeDefined();
    expect(descriptorFor(arrayNode, 'typescript')?.openToken).toBe('[');
    expect(descriptorFor(arrayNode, 'typescript')?.closeToken).toBe(']');
    expect(descriptorFor(arrayNode, 'typescript')?.separator).toBe(',');
    expect(descriptorFor(arrayNode, 'typescript')?.bracketSpacing).toBe(false);
    expect(descriptorFor(arrayNode, 'typescript')?.elementsField).toEqual({
      kind: 'named-children',
    });
  });
  it('should be able to get type descriptor for typescript object', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_OBJECT);
    const objectNode = walkToNodeType(tree.rootNode, 'object');

    if (!objectNode) {
      assert.fail('Unable to find object node');
    }

    expect(isSupported(objectNode, 'typescript')).toBe(true);
    expect(descriptorFor(objectNode, 'typescript')).toBeDefined();
    expect(descriptorFor(objectNode, 'typescript')?.openToken).toBe('{');
    expect(descriptorFor(objectNode, 'typescript')?.closeToken).toBe('}');
    expect(descriptorFor(objectNode, 'typescript')?.separator).toBe(',');
    expect(descriptorFor(objectNode, 'typescript')?.bracketSpacing).toBe(true);
    expect(descriptorFor(objectNode, 'typescript')?.elementsField).toEqual({
      kind: 'named-children',
    });
  });
  it('should not be able to get type descriptor for typescript string', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_STRING);
    const stringNode = walkToNodeType(tree.rootNode, 'string');

    if (!stringNode) {
      assert.fail('Unable to find string node');
    }

    expect(isSupported(stringNode, 'typescript')).toBe(false);
    expect(descriptorFor(stringNode, 'typescript')).toBeUndefined();
  });
  it('should be able to get type descriptor for typescript arguments', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_ARGUMENTS);
    const argumentsNode = walkToNodeType(tree.rootNode, 'arguments');

    if (!argumentsNode) {
      assert.fail('Unable to find arguments node');
    }

    expect(isSupported(argumentsNode, 'typescript')).toBe(true);
    expect(descriptorFor(argumentsNode, 'typescript')).toBeDefined();
    expect(descriptorFor(argumentsNode, 'typescript')?.openToken).toBe('(');
    expect(descriptorFor(argumentsNode, 'typescript')?.closeToken).toBe(')');
    expect(descriptorFor(argumentsNode, 'typescript')?.separator).toBe(',');
    expect(descriptorFor(argumentsNode, 'typescript')?.bracketSpacing).toBe(false);
    expect(descriptorFor(argumentsNode, 'typescript')?.elementsField).toEqual({
      kind: 'named-children',
    });
  });
  it('should be able to get type descriptor for typescript formal_parameters', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_FORMAL_PARAMETERS);
    const formalParametersNode = walkToNodeType(tree.rootNode, 'formal_parameters');

    if (!formalParametersNode) {
      assert.fail('Unable to find formal_parameters node');
    }

    expect(isSupported(formalParametersNode, 'typescript')).toBe(true);
    expect(descriptorFor(formalParametersNode, 'typescript')).toBeDefined();
    expect(descriptorFor(formalParametersNode, 'typescript')?.openToken).toBe('(');
    expect(descriptorFor(formalParametersNode, 'typescript')?.closeToken).toBe(')');
    expect(descriptorFor(formalParametersNode, 'typescript')?.separator).toBe(',');
    expect(descriptorFor(formalParametersNode, 'typescript')?.bracketSpacing).toBe(false);
    expect(descriptorFor(formalParametersNode, 'typescript')?.elementsField).toEqual({
      kind: 'named-children',
    });
  });
  it('should be able to get type descriptor for typescript array_pattern', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_ARRAY_PATTERN);
    const arrayPatternNode = walkToNodeType(tree.rootNode, 'array_pattern');

    if (!arrayPatternNode) {
      assert.fail('Unable to find array_pattern node');
    }

    expect(isSupported(arrayPatternNode, 'typescript')).toBe(true);
    expect(descriptorFor(arrayPatternNode, 'typescript')).toBeDefined();
    expect(descriptorFor(arrayPatternNode, 'typescript')?.openToken).toBe('[');
    expect(descriptorFor(arrayPatternNode, 'typescript')?.closeToken).toBe(']');
    expect(descriptorFor(arrayPatternNode, 'typescript')?.separator).toBe(',');
    expect(descriptorFor(arrayPatternNode, 'typescript')?.bracketSpacing).toBe(false);
    expect(descriptorFor(arrayPatternNode, 'typescript')?.elementsField).toEqual({
      kind: 'named-children',
    });
  });
  it('should be able to get type descriptor for typescript object_pattern', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_OBJECT_PATTERN);
    const objectPatternNode = walkToNodeType(tree.rootNode, 'object_pattern');

    if (!objectPatternNode) {
      assert.fail('Unable to find object_pattern node');
    }

    expect(isSupported(objectPatternNode, 'typescript')).toBe(true);
    expect(descriptorFor(objectPatternNode, 'typescript')).toBeDefined();
    expect(descriptorFor(objectPatternNode, 'typescript')?.openToken).toBe('{');
    expect(descriptorFor(objectPatternNode, 'typescript')?.closeToken).toBe('}');
    expect(descriptorFor(objectPatternNode, 'typescript')?.separator).toBe(',');
    expect(descriptorFor(objectPatternNode, 'typescript')?.bracketSpacing).toBe(true);
    expect(descriptorFor(objectPatternNode, 'typescript')?.elementsField).toEqual({
      kind: 'named-children',
    });
  });

  it('should get a tuple_type descriptor with array-like brackets', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_TUPLE_TYPE);
    const node = walkToNodeType(tree.rootNode, 'tuple_type');
    if (!node) assert.fail('Unable to find tuple_type node');

    expect(isSupported(node, 'typescript')).toBe(true);
    const d = descriptorFor(node, 'typescript');
    expect(d?.openToken).toBe('[');
    expect(d?.closeToken).toBe(']');
    expect(d?.separator).toBe(',');
    expect(d?.bracketSpacing).toBe(false);
  });

  it('should get a type_arguments descriptor with angle brackets', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_TYPE_ARGUMENTS);
    const node = walkToNodeType(tree.rootNode, 'type_arguments');
    if (!node) assert.fail('Unable to find type_arguments node');

    expect(isSupported(node, 'typescript')).toBe(true);
    const d = descriptorFor(node, 'typescript');
    expect(d?.openToken).toBe('<');
    expect(d?.closeToken).toBe('>');
    expect(d?.separator).toBe(',');
    expect(d?.bracketSpacing).toBe(false);
  });

  it('should get a type_parameters descriptor with angle brackets', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_TYPE_PARAMETERS);
    const node = walkToNodeType(tree.rootNode, 'type_parameters');
    if (!node) assert.fail('Unable to find type_parameters node');

    expect(isSupported(node, 'typescript')).toBe(true);
    const d = descriptorFor(node, 'typescript');
    expect(d?.openToken).toBe('<');
    expect(d?.closeToken).toBe('>');
    expect(d?.bracketSpacing).toBe(false);
  });

  it('should get an object_type descriptor that accepts , and ; separators', async () => {
    const tree = await getTypescriptTree('type X = { a: string; b: number }');
    const node = walkToNodeType(tree.rootNode, 'object_type');
    if (!node) assert.fail('Unable to find object_type node');

    expect(isSupported(node, 'typescript')).toBe(true);
    const d = descriptorFor(node, 'typescript');
    expect(d?.openToken).toBe('{');
    expect(d?.closeToken).toBe('}');
    expect(d?.bracketSpacing).toBe(true);
    expect(d?.separator).toBe(';');
    expect(separatorsFor(d!)).toEqual([';', ',']);
  });

  it('separatorsFor falls back to [separator] when separators is unset', async () => {
    const tree = await getTypescriptTree(TYPESCRIPT_ARRAY);
    const node = walkToNodeType(tree.rootNode, 'array');
    if (!node) assert.fail('Unable to find array node');
    expect(separatorsFor(descriptorFor(node, 'typescript')!)).toEqual([',']);
  });

  describe('resolveSeparator (object_type)', () => {
    async function objectTypeNode(source: string): Promise<SyntaxNode> {
      const tree = await getTypescriptTree(source);
      const node = walkToNodeType(tree.rootNode, 'object_type');
      if (!node) assert.fail('Unable to find object_type node');
      return node;
    }

    it('preserves an existing semicolon', async () => {
      const node = await objectTypeNode('type X = { a: string; b: number }');
      expect(resolveSeparator(node, descriptorFor(node, 'typescript')!)).toBe(';');
    });

    it('preserves an existing comma', async () => {
      const node = await objectTypeNode('type X = { a: string, b: number }');
      expect(resolveSeparator(node, descriptorFor(node, 'typescript')!)).toBe(',');
    });

    it('uses the first separator for a mixed node', async () => {
      const node = await objectTypeNode('type X = { a: string, b: number; c: boolean }');
      expect(resolveSeparator(node, descriptorFor(node, 'typescript')!)).toBe(',');
    });

    it('defaults to ; when no separator is present', async () => {
      const node = await objectTypeNode('type X = { a: string }');
      expect(resolveSeparator(node, descriptorFor(node, 'typescript')!)).toBe(';');
    });
  });
});

describe('PHP node types', () => {
  async function getPhpTree(source: string): Promise<Tree> {
    return await parseSource(source, 'php', async (filename: string) =>
      readFileSync(join(__dirname, '../../wasm', filename)),
    );
  }

  async function phpNode(source: string, type: string): Promise<SyntaxNode> {
    const tree = await getPhpTree(source);
    const node = walkToNodeType(tree.rootNode, type);
    if (!node) assert.fail(`Unable to find ${type} node`);
    return node;
  }

  it('supports array_creation_expression with array-like brackets', async () => {
    const node = await phpNode('<?php $x = [1, 2, 3];', 'array_creation_expression');
    expect(isSupported(node, 'php')).toBe(true);
    const d = descriptorFor(node, 'php');
    expect(d?.separator).toBe(',');
    expect(d?.bracketSpacing).toBe(false);
    expect(getOpeningToken(node, d!)).toBe('[');
    expect(getClosingToken(node, d!)).toBe(']');
  });

  it('resolves the array(...) surface form to its own delimiters', async () => {
    const node = await phpNode('<?php $x = array(1, 2, 3);', 'array_creation_expression');
    const d = descriptorFor(node, 'php');
    expect(getOpeningToken(node, d!)).toBe('array(');
    expect(getClosingToken(node, d!)).toBe(')');
  });

  it('supports arguments and formal_parameters', async () => {
    const args = await phpNode('<?php foo($a, $b);', 'arguments');
    const params = await phpNode('<?php function f($a, $b) {}', 'formal_parameters');
    expect(isSupported(args, 'php')).toBe(true);
    expect(isSupported(params, 'php')).toBe(true);
    expect(descriptorFor(args, 'php')?.openToken).toBe('(');
    expect(descriptorFor(params, 'php')?.closeToken).toBe(')');
  });

  it('supports namespace_use_group and forbids a trailing separator there', async () => {
    const node = await phpNode('<?php use Foo\\{A, B};', 'namespace_use_group');
    const d = descriptorFor(node, 'php');
    expect(isSupported(node, 'php')).toBe(true);
    expect(d?.openToken).toBe('{');
    expect(d?.bracketSpacing).toBe(false);
    expect(d?.forbidTrailingSeparator).toBe(true);
  });

  it('supports match_block with padded braces', async () => {
    const node = await phpNode("<?php $r = match($x) { 1 => 'a' };", 'match_block');
    const d = descriptorFor(node, 'php');
    expect(isSupported(node, 'php')).toBe(true);
    expect(d?.bracketSpacing).toBe(true);
  });

  it('isolates descriptors by grammar (php array node is unsupported under typescript)', async () => {
    const node = await phpNode('<?php $x = [1, 2, 3];', 'array_creation_expression');
    expect(isSupported(node, 'php')).toBe(true);
    expect(isSupported(node, 'typescript')).toBe(false);
    expect(descriptorFor(node, 'typescript')).toBeUndefined();
  });

  describe('isLineComment', () => {
    it('treats # as a line comment in php but not in typescript', async () => {
      const node = await phpNode('<?php $x = [1, # note\n2];', 'array_creation_expression');
      const hash = node.children.find((c) => c?.type === 'comment');
      if (!hash) assert.fail('no comment node found');
      expect(hash.text.startsWith('#')).toBe(true);
      expect(isLineComment(hash, 'php')).toBe(true);
      expect(isLineComment(hash, 'typescript')).toBe(false);
    });

    it('treats // as a line comment in php', async () => {
      const node = await phpNode('<?php $x = [1, // note\n2];', 'array_creation_expression');
      const slash = node.children.find((c) => c?.type === 'comment');
      if (!slash) assert.fail('no comment node found');
      expect(isLineComment(slash, 'php')).toBe(true);
    });

    it('does not treat a block comment as a line comment', async () => {
      const node = await phpNode('<?php $x = [1, /* note */ 2];', 'array_creation_expression');
      const block = node.children.find((c) => c?.type === 'comment');
      if (!block) assert.fail('no comment node found');
      expect(isLineComment(block, 'php')).toBe(false);
    });
  });
});

describe('JSON / JSONC node types', () => {
  async function jsonNode(source: string, type: string, languageId = 'json'): Promise<SyntaxNode> {
    const tree = await parseSource(source, languageId, async (filename: string) =>
      readFileSync(join(__dirname, '../../wasm', filename)),
    );
    const node = walkToNodeType(tree.rootNode, type);
    if (!node) assert.fail(`Unable to find ${type} node`);
    return node;
  }

  it('supports array with unpadded brackets', async () => {
    const node = await jsonNode('[1, 2, 3]', 'array');
    expect(isSupported(node, 'json')).toBe(true);
    const d = descriptorFor(node, 'json');
    expect(d?.bracketSpacing).toBe(false);
    expect(getOpeningToken(node, d!)).toBe('[');
    expect(getClosingToken(node, d!)).toBe(']');
    expect(resolveSeparator(node, d!)).toBe(',');
  });

  it('supports object with padded braces', async () => {
    const node = await jsonNode('{ "a": 1 }', 'object');
    expect(isSupported(node, 'json')).toBe(true);
    const d = descriptorFor(node, 'json');
    expect(d?.bracketSpacing).toBe(true);
    expect(getOpeningToken(node, d!)).toBe('{');
    expect(getClosingToken(node, d!)).toBe('}');
  });

  // A trailing separator is invalid in strict JSON, and tree-sitter-json cannot
  // parse one even in JSONC — `{"a": 1,}` yields an ERROR node — so emitting one
  // would leave text this extension can no longer re-parse. Both descriptors
  // therefore override `tree-join.trailingComma` unconditionally.
  it('forbids a trailing separator on both array and object', async () => {
    const array = await jsonNode('[1, 2]', 'array');
    const object = await jsonNode('{ "a": 1 }', 'object');
    expect(descriptorFor(array, 'json')?.forbidTrailingSeparator).toBe(true);
    expect(descriptorFor(object, 'json')?.forbidTrailingSeparator).toBe(true);
  });

  it('leaves non-container JSON nodes unsupported', async () => {
    const pair = await jsonNode('{ "a": 1 }', 'pair');
    const string = await jsonNode('{ "a": 1 }', 'string');
    expect(isSupported(pair, 'json')).toBe(false);
    expect(isSupported(string, 'json')).toBe(false);
  });

  it('resolves both the json and jsonc language ids to the json grammar', async () => {
    expect(LANGUAGE_ID_TO_GRAMMAR['json']).toBe('json');
    expect(LANGUAGE_ID_TO_GRAMMAR['jsonc']).toBe('json');
    // Parsing through the `jsonc` id yields nodes the `json` table supports.
    const node = await jsonNode('{ "a": 1 }', 'object', 'jsonc');
    expect(isSupported(node, 'json')).toBe(true);
  });

  it('isolates descriptors by grammar (a JSON object is not a PHP node)', async () => {
    const node = await jsonNode('{ "a": 1 }', 'object');
    expect(isSupported(node, 'json')).toBe(true);
    expect(isSupported(node, 'php')).toBe(false);
    expect(descriptorFor(node, 'php')).toBeUndefined();
  });

  describe('isLineComment', () => {
    it('treats // as a line comment (the JSONC join guard)', async () => {
      const node = await jsonNode('{\n  // note\n  "a": 1\n}', 'object');
      const comment = node.children.find((c) => c?.type === 'comment');
      if (!comment) assert.fail('no comment node found');
      expect(comment.text.startsWith('//')).toBe(true);
      expect(isLineComment(comment, 'json')).toBe(true);
    });

    it('does not treat a block comment as a line comment', async () => {
      const node = await jsonNode('{ /* note */ "a": 1 }', 'object');
      const block = node.children.find((c) => c?.type === 'comment');
      if (!block) assert.fail('no comment node found');
      expect(isLineComment(block, 'json')).toBe(false);
    });
  });
});
