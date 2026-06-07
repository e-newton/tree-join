import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NODE_TYPES } from '../../src/nodeTypes';

// Release-metadata guards (T-18). These assert the publishable manifest, README,
// CHANGELOG, and icon stay internally consistent so a packaging/marketplace
// regression fails CI rather than the first publish. No transform logic here —
// this is the release-ticket analogue of the transform fixtures.

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const pkg = JSON.parse(read('package.json')) as {
  name: string;
  version: string;
  publisher: string;
  icon?: string;
  main: string;
  browser: string;
  engines: { vscode: string };
  categories: string[];
  keywords: string[];
  repository: { url: string };
  homepage: string;
  bugs: { url: string };
  activationEvents: string[];
  contributes: {
    commands: { command: string; title: string }[];
    configuration: { properties: Record<string, unknown> };
  };
};

const SEMVER = /^\d+\.\d+\.\d+$/;
const EXPECTED_COMMANDS = [
  'tree-join.toggle',
  'tree-join.split',
  'tree-join.join',
  'tree-join.splitRecursive',
  'tree-join.joinRecursive',
];
const EXPECTED_SETTINGS = [
  'tree-join.maxJoinLength',
  'tree-join.trailingComma',
  'tree-join.bracketSpacing',
];
const EXPECTED_LANGUAGES = ['typescript', 'typescriptreact', 'javascript', 'javascriptreact'];

describe('package.json manifest', () => {
  it('is named tree-join with publisher EricNewton (extension id EricNewton.tree-join)', () => {
    expect(pkg.name).toBe('tree-join');
    expect(pkg.publisher).toBe('EricNewton');
  });

  it('has a release-ready semver version', () => {
    expect(pkg.version).toMatch(SEMVER);
  });

  it('declares engines.vscode and both Node + web entry points', () => {
    expect(pkg.engines.vscode).toBe('^1.85.0');
    expect(pkg.main).toBe('./dist/extension.js');
    expect(pkg.browser).toBe('./dist/extension.web.js');
  });

  it('points repository/homepage/bugs at the real github.com/e-newton repo', () => {
    for (const url of [pkg.repository.url, pkg.homepage, pkg.bugs.url]) {
      expect(url).toContain('github.com/e-newton/tree-join');
      expect(url).not.toContain('github.com/ericnewton/');
    }
  });

  it('declares marketplace categories and keywords', () => {
    expect(pkg.categories.length).toBeGreaterThan(0);
    expect(pkg.keywords.length).toBeGreaterThan(0);
  });

  it('activates on exactly the four supported languages', () => {
    expect(pkg.activationEvents.sort()).toEqual(
      EXPECTED_LANGUAGES.map((l) => `onLanguage:${l}`).sort(),
    );
  });

  it('registers all five commands, each with a "Tree Join:" title', () => {
    const ids = pkg.contributes.commands.map((c) => c.command);
    expect(ids.sort()).toEqual([...EXPECTED_COMMANDS].sort());
    for (const c of pkg.contributes.commands) {
      expect(c.title.startsWith('Tree Join:')).toBe(true);
    }
  });

  it('declares exactly the three v1 settings', () => {
    expect(Object.keys(pkg.contributes.configuration.properties).sort()).toEqual(
      [...EXPECTED_SETTINGS].sort(),
    );
  });
});

describe('extension icon', () => {
  it('is referenced and the file exists', () => {
    expect(pkg.icon).toBe('images/icon.png');
    expect(existsSync(join(ROOT, pkg.icon!))).toBe(true);
  });

  it('is a 128x128 PNG (valid signature + IHDR dimensions)', () => {
    const buf = readFileSync(join(ROOT, pkg.icon!));
    // PNG 8-byte signature.
    expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    // IHDR is the first chunk: length(4) + "IHDR"(4) then width(4)/height(4).
    expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
    expect(buf.readUInt32BE(16)).toBe(128); // width
    expect(buf.readUInt32BE(20)).toBe(128); // height
  });
});

describe('README', () => {
  const readme = read('README.md');

  it('has the user-facing sections marketplace readers expect', () => {
    for (const heading of [
      '# Tree Join',
      '## Features',
      '## Commands',
      '## Supported node types',
      '## Settings',
      '## Keybindings',
      '## Contributing',
      '## License',
    ]) {
      expect(readme).toContain(heading);
    }
  });

  it('embeds the animated demo GIF', () => {
    expect(readme).toMatch(/!\[[^\]]*\]\(images\/toggle\.gif\)/);
  });

  it('documents every command id', () => {
    for (const id of EXPECTED_COMMANDS) expect(readme).toContain(id);
  });

  it('documents every setting id', () => {
    for (const id of EXPECTED_SETTINGS) expect(readme).toContain(id);
  });

  it('documents every supported tree-sitter node type', () => {
    for (const type of Object.keys(NODE_TYPES)) expect(readme).toContain(type);
  });

  it('includes a recommended keybinding snippet for toggle', () => {
    expect(readme).toContain('tree-join.toggle');
    expect(readme).toMatch(/"key":\s*"/);
  });
});

describe('CHANGELOG', () => {
  const changelog = read('CHANGELOG.md');

  it('has an entry whose version matches package.json', () => {
    expect(changelog).toContain(`## [${pkg.version}]`);
  });

  it('mentions every command in the release notes', () => {
    for (const id of EXPECTED_COMMANDS) expect(changelog).toContain(id);
  });
});
