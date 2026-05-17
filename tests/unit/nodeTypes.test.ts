import { assert, describe, expect, it } from 'vitest';
import type { SyntaxNode } from '../../src/parseSource';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSource } from '../../src/parseSource';
import { descriptorFor, isSupported } from '../../src/nodeTypes';

const TYPESCRIPT_ARRAY = 'const x = [1, 2, 3]';
const TYPESCRIPT_OBJECT = 'const x = {a:1}';
const TYPESCRIPT_STRING = 'const x = "Hello World!"';

function walkToNodeType(node: SyntaxNode, targetNodeType: string): SyntaxNode | undefined {
    if (node.type === targetNodeType) return node;

    if (!node.childCount) {
        return undefined;
    }

    const cursor = node.walk();
    cursor.gotoFirstChild();
    let foundNode = walkToNodeType(cursor.currentNode, targetNodeType);
    while (!foundNode && cursor.gotoNextSibling()) {
        foundNode = walkToNodeType(cursor.currentNode, targetNodeType);
    }

    return foundNode;
}

describe('Note Types', () => {
    it('should be able to get type descriptor for typescript array', async () => {
        const tree = await parseSource(TYPESCRIPT_ARRAY, 'typescript', async (filename: string) => {
            return readFileSync(join(__dirname, '../../wasm', filename));
        });

        if (!tree) {
            assert.fail('Unable to parse tree');
        }

        const arrayNode = walkToNodeType(tree.rootNode, 'array');

        if (!arrayNode) {
            assert.fail('Unable to find array node');
        }

        expect(isSupported(arrayNode)).toBe(true);
        expect(descriptorFor(arrayNode)).toBeDefined();
        expect(descriptorFor(arrayNode)?.openToken).toBe('[');
        expect(descriptorFor(arrayNode)?.closeToken).toBe(']');
        expect(descriptorFor(arrayNode)?.separator).toBe(',');
    });
    it('should be able to get type descriptor for typescript object', async () => {
        const tree = await parseSource(TYPESCRIPT_OBJECT, 'typescript', async (filename: string) => {
            return readFileSync(join(__dirname, '../../wasm', filename));
        });

        if (!tree) {
            assert.fail('Unable to parse tree');
        }

        const objectNode = walkToNodeType(tree.rootNode, 'object');

        if (!objectNode) {
            assert.fail('Unable to find object node');
        }

        expect(isSupported(objectNode)).toBe(true);
        expect(descriptorFor(objectNode)).toBeDefined();
        expect(descriptorFor(objectNode)?.openToken).toBe('{');
        expect(descriptorFor(objectNode)?.closeToken).toBe('}');
        expect(descriptorFor(objectNode)?.separator).toBe(',');
    });
    it('should be not able to get type descriptor for typescript string', async () => {
        const tree = await parseSource(TYPESCRIPT_STRING, 'typescript', async (filename: string) => {
            return readFileSync(join(__dirname, '../../wasm', filename));
        });

        if (!tree) {
            assert.fail('Unable to parse tree');
        }

        const stringNode = walkToNodeType(tree.rootNode, 'string');

        if (!stringNode) {
            assert.fail('Unable to find string node');
        }

        expect(isSupported(stringNode)).toBe(false);
        expect(descriptorFor(stringNode)).toBeUndefined();

    });
});