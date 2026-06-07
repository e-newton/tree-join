import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import { webConfig } from '../../esbuild.config.mjs';

// Builds the web bundle in-memory (no reliance on `npm run build` having run)
// and asserts no Node-only construct leaked into it. The web extension host has
// no module loader and no Node globals, so any of these surviving the bundle
// would throw the moment the offending line executed in vscode.dev/github.dev.
async function buildWebBundleText(): Promise<string> {
  const result = await build({
    ...webConfig,
    write: false,
    sourcemap: false,
    minify: false,
  });
  const out = result.outputFiles?.[0]?.text;
  if (!out) throw new Error('web bundle produced no output');
  return out;
}

describe('web bundle', () => {
  it('contains no require() of Node built-in modules', async () => {
    const text = await buildWebBundleText();
    const matches = text.match(
      /require\(\s*["'](?:node:)?(?:fs|path|os|crypto|url|module|child_process|stream|util)(?:\/promises)?["']\s*\)/g,
    );
    expect(matches ?? []).toEqual([]);
  });

  it('contains no dynamic import() of Node built-in modules', async () => {
    const text = await buildWebBundleText();
    const matches = text.match(
      /import\(\s*["'](?:node:)?(?:fs|path|os|crypto|url|module)(?:\/promises)?["']\s*\)/g,
    );
    expect(matches ?? []).toEqual([]);
  });

  it('contains no bare __dirname / __filename references', async () => {
    const text = await buildWebBundleText();
    expect(text.match(/\b__dirname\b/g) ?? []).toEqual([]);
    expect(text.match(/\b__filename\b/g) ?? []).toEqual([]);
  });

  it('produces a non-empty CommonJS bundle', async () => {
    const text = await buildWebBundleText();
    expect(text.length).toBeGreaterThan(1000);
    // esbuild's cjs output for the extension assigns onto `module.exports`.
    expect(text).toMatch(/module\.exports|exports\./);
  });
});
