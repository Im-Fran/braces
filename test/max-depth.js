'use strict';

require('mocha');
const assert = require('assert').strict;
const braces = require('..');
const { MAX_DEPTH } = require('../lib/constants');

// GHSA-vfj7-8cjw-p6xm: nesting is capped in parse and in the compile, expand
// and stringify walkers, so ASTs passed in directly are covered as well.

const nestedBraces = n => '{a,'.repeat(n) + 'a' + '}'.repeat(n);

const nestedAst = n => {
  let node = { type: 'text', value: 'a' };
  for (let i = 0; i < n; i++) {
    const nodes = [
      { type: 'open', value: '{' },
      node,
      { type: 'comma', value: ',' },
      { type: 'text', value: 'b' },
      { type: 'close', value: '}' }
    ];
    // compile reads `prev` on commas, as set by parse
    nodes.forEach((child, i) => (child.prev = nodes[i - 1]));
    node = { type: 'brace', nodes };
  }
  return { type: 'root', nodes: [{ type: 'bos' }, node, { type: 'eos' }] };
};

const walkers = ['compile', 'expand', 'stringify'];

describe('max depth', () => {
  describe('strings', () => {
    it('should accept nesting up to max depth', () => {
      const input = nestedBraces(MAX_DEPTH);
      assert.doesNotThrow(() => braces(input));
      assert.doesNotThrow(() => braces.parse(input));
      assert.doesNotThrow(() => braces.compile(input));
      assert.equal(braces.expand(input).length, MAX_DEPTH + 1);
    });

    it('should throw a SyntaxError past max depth', () => {
      const inputs = [
        nestedBraces(MAX_DEPTH + 1),
        '('.repeat(MAX_DEPTH + 1) + 'a' + ')'.repeat(MAX_DEPTH + 1),
        '{('.repeat(51) + 'a' + ')}'.repeat(51)
      ];

      for (const input of inputs) {
        assert.throws(() => braces(input), SyntaxError);
        assert.throws(() => braces(input, { expand: true }), SyntaxError);
        assert.throws(() => braces.parse(input), SyntaxError);
        assert.throws(() => braces.compile(input), SyntaxError);
        assert.throws(() => braces.expand(input), SyntaxError);
      }
    });

    it('should throw a SyntaxError, not a RangeError, under the max length', () => {
      const input = '{'.repeat(4998) + 'a,b' + '}'.repeat(4998);
      assert.equal(input.length, 9999);
      assert.throws(() => braces.expand(input), SyntaxError);
      assert.throws(() => braces.compile(input), SyntaxError);
    });
  });

  describe('ASTs', () => {
    it('should accept ASTs up to max depth', () => {
      assert.doesNotThrow(() => braces.compile(nestedAst(MAX_DEPTH)));
      assert.doesNotThrow(() => braces.stringify(nestedAst(MAX_DEPTH)));
      assert.equal(braces.expand(nestedAst(MAX_DEPTH)).length, MAX_DEPTH + 1);
    });

    it('should throw a SyntaxError on ASTs past max depth', () => {
      for (const fn of walkers) {
        assert.throws(() => braces[fn](nestedAst(MAX_DEPTH + 1)), SyntaxError);
      }
    });

    it('should throw a SyntaxError, not a RangeError, on very deep ASTs', () => {
      for (const fn of walkers) {
        assert.throws(() => braces[fn](nestedAst(20000)), SyntaxError);
      }
    });

    it('should throw a SyntaxError on cyclic ASTs', () => {
      for (const fn of walkers) {
        const ast = nestedAst(1);
        const brace = ast.nodes[1];
        brace.nodes[1] = brace;
        assert.throws(() => braces[fn](ast), SyntaxError);
      }
    });
  });

  describe('options.maxDepth', () => {
    it('should lower the limit', () => {
      const options = { maxDepth: 5 };
      assert.equal(braces.expand(nestedBraces(5), options).length, 6);
      assert.throws(() => braces.expand(nestedBraces(6), options), SyntaxError);

      for (const fn of walkers) {
        assert.doesNotThrow(() => braces[fn](nestedAst(5), options));
        assert.throws(() => braces[fn](nestedAst(6), options), SyntaxError);
      }
    });

    it('should not raise the limit past MAX_DEPTH', () => {
      const options = { maxDepth: MAX_DEPTH * 10 };
      assert.throws(() => braces(nestedBraces(MAX_DEPTH + 1), options), SyntaxError);
      assert.throws(() => braces.compile(nestedAst(MAX_DEPTH + 1), options), SyntaxError);
    });

    it('should throw a TypeError on invalid values', () => {
      for (const maxDepth of [0, -1, '10', 1.5, Infinity, NaN, null]) {
        assert.throws(() => braces('{a,b}', { maxDepth }), TypeError);
        assert.throws(() => braces.compile(nestedAst(1), { maxDepth }), TypeError);
      }
    });
  });

  describe('regression', () => {
    const fixtures = [
      ['src/{a,b}/{1..3}.ts', ['src/(a|b)/([1-3]).ts'], ['src/a/1.ts', 'src/a/2.ts', 'src/a/3.ts', 'src/b/1.ts', 'src/b/2.ts', 'src/b/3.ts']],
      ['a/{x,y{1..2}}/c', ['a/(x|y(1|2))/c'], ['a/x/c', 'a/y1/c', 'a/y2/c']],
      ['a\\{b,c}', ['a{b,c}'], ['a{b,c}']],
      ['{a,"b,c"}', ['(a|b,c)'], ['a', 'b,c']],
      ['a/{01..03}/b', ['a/(0[1-3])/b'], ['a/01/b', 'a/02/b', 'a/03/b']],
      ['{a..c}', ['([a-c])'], ['a', 'b', 'c']],
      ['(a|{b,c})', ['(a|(b|c))'], ['(a|b)', '(a|c)']]
    ];

    for (const [input, compiled, expanded] of fixtures) {
      it(`should handle ${input} as before`, () => {
        assert.deepEqual(braces(input), compiled);
        assert.deepEqual(braces(input, { expand: true }), expanded);
      });
    }
  });
});
