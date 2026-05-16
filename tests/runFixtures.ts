import { readdirSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

export type FixtureFn = (input: string) => Promise<string>;

const IN_SUFFIX = '.in.ts';
const OUT_SUFFIX = '.out.ts';

function toDirPath(dir: URL | string): string {
  if (dir instanceof URL) return fileURLToPath(dir);
  if (dir.startsWith('file://')) return fileURLToPath(dir);
  return dir;
}

function stripTrailingNewline(s: string): string {
  return s.endsWith('\n') ? s.slice(0, -1) : s;
}

export function runFixtures(dir: URL | string, fn: FixtureFn): void {
  const dirPath = toDirPath(dir);
  const dirName = basename(dirPath);
  const update = process.env.UPDATE_FIXTURES === '1';

  const inputs = readdirSync(dirPath)
    .filter((name) => name.endsWith(IN_SUFFIX))
    .sort();

  describe(dirName, () => {
    if (inputs.length === 0) {
      it('has at least one fixture', () => {
        throw new Error(`runFixtures: no *.in.ts files in ${dirPath}`);
      });
      return;
    }

    for (const inFile of inputs) {
      const name = inFile.slice(0, -IN_SUFFIX.length);
      const outFile = `${name}${OUT_SUFFIX}`;
      const inputPath = join(dirPath, inFile);
      const outputPath = join(dirPath, outFile);

      it(name, async () => {
        const inputRaw = await readFile(inputPath, 'utf8');
        const input = stripTrailingNewline(inputRaw);
        const actual = await fn(input);

        let expected: string | undefined;
        try {
          const expectedRaw = await readFile(outputPath, 'utf8');
          expected = stripTrailingNewline(expectedRaw);
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
        }

        if (expected === undefined) {
          if (update) {
            await writeFile(outputPath, `${actual}\n`);
            return;
          }
          throw new Error(
            `runFixtures: missing snapshot ${outputPath}\n` +
              `Run \`npm run test:update\` to create it.`,
          );
        }

        if (update && actual !== expected) {
          await writeFile(outputPath, `${actual}\n`);
          return;
        }

        expect(actual).toBe(expected);
      });
    }
  });
}
