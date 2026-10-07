'use strict';

require('mocha');
const assert = require('assert').strict;
const parse = require('../lib/parse');
const braces = require('..');
const { MAX_DEPTH } = require('../lib/constants');

describe('braces.parse()', () => {
  describe('errors', () => {
    it('should throw an error when string exceeds max safe length', () => {
      const MAX_LENGTH = 1024 * 64;
      assert.throws(() => parse('.'.repeat(MAX_LENGTH + 2)));
    });

    // GHSA-vfj7-8cjw-p6xm: nesting is capped in parse, so every consumer of the AST is covered
    it('should throw a SyntaxError when nesting exceeds max depth', () => {
      const over = MAX_DEPTH + 2;
      const braced = '{'.repeat(over) + 'a,b' + '}'.repeat(over);
      const parens = '('.repeat(over) + 'a' + ')'.repeat(over);

      for (const input of [braced, parens]) {
        assert.throws(() => parse(input), SyntaxError);
        assert.throws(() => braces(input), SyntaxError);
        assert.throws(() => braces(input, { expand: true }), SyntaxError);
        assert.throws(() => braces.stringify(input), SyntaxError);
      }
    });

    it('should accept nesting up to max depth', () => {
      const input = '{a,'.repeat(MAX_DEPTH) + 'a' + '}'.repeat(MAX_DEPTH);
      assert.equal(braces(input, { expand: true }).length, MAX_DEPTH + 1);
      assert.doesNotThrow(() => braces(input));
    });
  });

  describe('valid', () => {
    it('should return an AST', () => {
      const ast = parse('a/{b,c}/d');
      const brace = ast.nodes.find(node => node.type === 'brace');
      assert.ok(brace);
      assert.equal(brace.nodes.length, 5);
    });

    it('should ignore braces inside brackets', () => {
      const ast = parse('a/[{b,c}]/d');
      assert.equal(ast.nodes[1].type, 'text');
      assert.equal(ast.nodes[1].value, 'a/[{b,c}]/d');
    });

    it('should parse braces with brackets inside', () => {
      const ast = parse('a/{a,b,[{c,d}]}/e');
      const brace = ast.nodes[2];
      const bracket = brace.nodes.find(node => node.value[0] === '[');
      assert.ok(bracket);
      assert.equal(bracket.value, '[{c,d}]');
    });
  });

  describe('invalid', () => {
    it('should escape standalone closing braces', () => {
      const one = parse('}');
      assert.equal(one.nodes[1].type, 'text');
      assert.equal(one.nodes[1].value, '}');

      const two = parse('a}b');
      assert.equal(two.nodes[1].type, 'text');
      assert.equal(two.nodes[1].value, 'a}b');
    });
  });
});
