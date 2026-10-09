'use strict';

require('mocha');
const assert = require('assert').strict;
const { execFileSync } = require('child_process');
const path = require('path');

// Runs in a child process because node@8 cannot parse `import`. Imports the
// package by name, so the "exports" map is what gets tested.
const code = `
import braces, { parse, stringify, compile, expand, create } from '@franciscosolis/braces';
import { createRequire } from 'module';
const cjs = createRequire(import.meta.url)('@franciscosolis/braces');
if (braces !== cjs) throw new Error('default export is not the CommonJS instance');
for (const [name, fn] of Object.entries({ parse, stringify, compile, expand, create })) {
  if (fn !== cjs[name]) throw new Error(name + ' is not the CommonJS function');
}
console.log(JSON.stringify(expand('a/{b,c}')));
`;

describe('esm', () => {
  before(function() {
    // ponytail: createRequire and unflagged ESM need node >= 12.20.
    const [major, minor] = process.versions.node.split('.').map(Number);
    if (major < 12 || (major === 12 && minor < 20)) this.skip();
  });

  it('should expose the CommonJS build as default and named exports', () => {
    const cwd = path.join(__dirname, '..');
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd });
    assert.deepEqual(JSON.parse(out.toString()), ['a/b', 'a/c']);
  });

  it('should keep deep requires working', () => {
    assert.equal(typeof require('@franciscosolis/braces/lib/parse'), 'function');
    assert.equal(typeof require('@franciscosolis/braces/lib/parse.js'), 'function');
    assert.equal(require('@franciscosolis/braces/package.json').name, '@franciscosolis/braces');
  });
});
