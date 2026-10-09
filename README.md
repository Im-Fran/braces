<div align="center">

# {braces}

**Bash-like brace expansion for JavaScript, with a fix for the deep-nesting crash ([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)).**

[![npm](https://img.shields.io/npm/v/@franciscosolis/braces)](https://www.npmjs.com/package/@franciscosolis/braces)
[![CI](https://img.shields.io/github/actions/workflow/status/Im-Fran/braces/ci.yml?branch=dev&label=CI)](https://github.com/Im-Fran/braces/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/Im-Fran/braces)](LICENSE)

</div>

---

## 📖 Overview

`@franciscosolis/braces` is a maintained fork of [micromatch/braces](https://github.com/micromatch/braces), the brace expansion library used by `micromatch`, `chokidar`, `fast-glob` and much of the npm ecosystem. It turns patterns like `a/{b,c}/d` or `{01..10}` into either a list of strings (as Bash does) or a compact, regex-ready string for matching.

The fork exists to fix [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) ([CVE-2026-93687](https://www.cve.org/CVERecord?id=CVE-2026-93687)). Deeply nested patterns under the `maxLength` limit exhausted the call stack and crashed the process with an uncaught `RangeError`. Every published version of `braces` up to 3.0.3 is affected, and upstream [declined to fix it](https://github.com/micromatch/braces/issues/70). This fork caps the nesting depth in the parser and in the `compile`, `expand` and `stringify` walkers, including ASTs passed in directly, and throws a `SyntaxError` instead.

The API is the same as `braces` 3.x, so it works as a drop-in replacement.

---

## ✨ Features

- **Bash 4.3 brace expansion**: lists (`{a,b}`), sequences (`{1..5}`, `{a..e}`), steps (`{1..10..2}`), zero padding (`{01..10}`), nesting and escaping.
- **Compile or expand**: by default patterns compile to regex-ready strings (`a/(b|c)/d`), which stay small even for huge ranges. Use `expand: true` to get every string.
- **Safe on untrusted input**: limits on input length (`maxLength`), nesting depth (`maxDepth`) and expanded range size (`rangeLimit`) throw catchable errors instead of hanging or crashing.
- **TypeScript declarations** included (since 3.1.0).
- **CommonJS and ESM**: `require()` and `import`, including named imports (since 3.1.0).
- **Wide runtime support**: Node.js >= 8.3. One runtime dependency ([fill-range](https://github.com/jonschlinkert/fill-range)).

---

## 📦 Installation

```bash
npm install @franciscosolis/braces
```

### Replacing `braces` in your dependency tree

Most projects get `braces` indirectly (through `micromatch`, `chokidar`, etc.). To swap it for this fork, add an override to your `package.json`. Versions stay in the 3.x major, so they satisfy the usual `^3.0.2` and `^3.0.3` ranges:

```json
{
  "overrides": {
    "braces": "npm:@franciscosolis/braces@^3.0.5"
  }
}
```

With Yarn use `resolutions`, and with pnpm use `pnpm.overrides`, with the same value. Then reinstall and check with `npm ls braces`.

---

## 🚀 Usage

```js
const braces = require('@franciscosolis/braces');
```

```js
// ESM (3.1.0+)
import braces, { expand, compile } from '@franciscosolis/braces';
```

The main export takes one pattern or an array of patterns, plus options, and always returns an array.

```js
braces('a/{x,y,z}/b'); //=> ['a/(x|y|z)/b']
braces(['{01..05}', '{a..e}']); //=> ['(0[1-5])', '([a-e])']
braces('a/{x,y,z}/b', { expand: true }); //=> ['a/x/b', 'a/y/b', 'a/z/b']
```

### Compile vs. expand

By default patterns are **compiled** into strings meant for building regular expressions. A range like `{1..1000000}` stays a short string instead of a million items. Set `expand: true`, or call `braces.expand()`, to get the strings Bash would print.

```js
braces('a/{001..300}/b'); //=> ['a/(00[1-9]|0[1-9][0-9]|[12][0-9]{2}|300)/b']
braces.expand('{01..05}'); //=> ['01', '02', '03', '04', '05']
```

### Lists

```js
braces.expand('a/{foo,bar,baz}/*.js'); //=> ['a/foo/*.js', 'a/bar/*.js', 'a/baz/*.js']
braces.expand('{a,b}{1,2}'); //=> ['a1', 'a2', 'b1', 'b2']
```

### Sequences and steps

```js
braces.expand('{1..3}'); //=> ['1', '2', '3']
braces.expand('{4..-4}'); //=> ['4', '3', '2', '1', '0', '-1', '-2', '-3', '-4']
braces.expand('{a..z..3}'); //=> ['a', 'd', 'g', 'j', 'm', 'p', 's', 'v', 'y']
braces('{2..10..2}'); //=> ['(2|4|6|8|10)']
```

### Nesting

Results keep left-to-right order and are not sorted.

```js
braces.expand('a{b,c,/{x,y}}/e'); //=> ['ab/e', 'ac/e', 'a/x/e', 'a/y/e']
braces('a/{x,{1..5},y}/c'); //=> ['a/(x|([1-5])|y)/c']
```

### Escaping

A pattern is left as-is when either brace is escaped, and escaped commas are not separators. As in Bash, a single item in braces is not expanded.

```js
braces.expand('a\\{d,c,b}e'); //=> ['a{d,c,b}e']
braces.expand('a{d\\,c,b}e'); //=> ['ad,ce', 'abe']
braces.expand('a{b}c'); //=> ['a{b}c']
```

---

## 📚 API

| Method | Returns | Description |
|--------|---------|-------------|
| `braces(patterns, options?)` | `string[]` | Compiles (or expands, with `expand: true`) one or more patterns. |
| `braces.compile(pattern \| ast, options?)` | `string` | Compiles to a regex-ready string. |
| `braces.expand(pattern \| ast, options?)` | `string[]` | Expands to every matching string. |
| `braces.create(pattern, options?)` | `string \| string[]` | Calls `compile`, or `expand` when `options.expand` is `true`. |
| `braces.parse(pattern, options?)` | AST | Parses a pattern into an AST. |
| `braces.stringify(pattern \| ast, options?)` | `string` | Turns an AST back into a pattern. |

```js
const ast = braces.parse('a/{b,c}');
braces.stringify(ast); //=> 'a/{b,c}'
braces.compile(ast); //=> 'a/(b|c)'
```

---

## ⚙️ Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `expand` | `boolean` | `false` | Return every expanded string instead of a regex-ready string. |
| `maxLength` | `number` | `10000` | Maximum input length. Longer input throws a `SyntaxError`. Values above `10000` are capped. |
| `maxDepth` | `number` | `100` | Maximum nesting depth of braces and parentheses, for strings and for ASTs passed to `compile`, `expand` and `stringify`. Deeper input throws a `SyntaxError`. Values above `100` are capped; values that are not integers `>= 1` throw a `TypeError`. |
| `rangeLimit` | `number` | `1000` | When expanding, a range with this many items or more throws a `RangeError`. Use `Infinity` to disable. |
| `nodupes` | `boolean` | `false` | Remove duplicates from the result. |
| `noempty` | `boolean` | `false` | Remove empty strings from the result of `expand`. |
| `transform` | `(value, index) => string` | | Customize each item of a range. `value` is a number for numeric ranges and a character code for letter ranges. |
| `keepEscaping` | `boolean` | `false` | Keep the backslashes used for escaping in the result. |
| `keepQuotes` | `boolean` | `false` | Keep the quotes around quoted strings in the result. |

```js
braces.expand('x/{a..e}/y', {
  transform: (value, index) => String.fromCharCode(value) + index,
}); //=> ['x/a0/y', 'x/b1/y', 'x/c2/y', 'x/d3/y', 'x/e4/y']
```

### Handling untrusted patterns

Brace expansion grows multiplicatively: `{1..100}{1..100}{1..100}` expands to a million strings. If users can supply patterns:

- Prefer compiling (the default) over expanding.
- Keep `rangeLimit` (and lower `maxLength` or `maxDepth` if you can).
- Catch the errors: `SyntaxError` for `maxLength`/`maxDepth`, `RangeError` for `rangeLimit`.

```js
try {
  braces('{a,{b,c}}', { maxDepth: 1 });
} catch (err) {
  // SyntaxError: Input nesting depth exceeds max depth (1)
}
```

---

## 🛠 Development

Requires **Node.js** >= 8.3 and **npm**.

```bash
git clone https://github.com/Im-Fran/braces.git
cd braces
npm install
npm test
```

Benchmarks against `minimatch` live in `bench/` and have their own dependencies:

```bash
cd bench
npm install
node index.js
```

CI runs the tests on Node.js 8.3 through 22. Releases are published to npm from GitHub Actions with [provenance](https://docs.npmjs.com/generating-provenance-statements) when a `v*` tag is pushed. See the [CHANGELOG](CHANGELOG.md) for what changed in each version.

### Keeping up with upstream

The fork follows upstream. To review and bring in upstream changes:

```bash
git remote add upstream https://github.com/micromatch/braces.git
git fetch upstream
git log dev..upstream/master
git checkout -b im-fran/chore/sync-upstream origin/dev
git merge upstream/master
```

Then open a pull request into `dev`. Always merge; never rebase the published history onto upstream.

---

## 🤝 Contributing

Issues and pull requests are welcome. Branch from `dev`, add tests for any behavior change, make sure `npm test` passes, and open a pull request into `dev`. Commits follow [Conventional Commits](https://www.conventionalcommits.org/).

Changes that are not specific to this fork are often worth proposing [upstream](https://github.com/micromatch/braces) too.

---

## 🔒 Security

Please report vulnerabilities privately through [GitHub security advisories](https://github.com/Im-Fran/braces/security/advisories/new), not in public issues.

---

## 🙏 Credits

`braces` was created by **[Jon Schlinkert](https://github.com/jonschlinkert)**, who wrote nearly all of it, and is maintained upstream at [micromatch/braces](https://github.com/micromatch/braces). This fork would not exist without that work. If it is useful to you, consider starring the original project.

Upstream contributors include [Brian Woodward](https://github.com/doowb), [Elan Shanker](https://github.com/es128), [Eugene Sharygin](https://github.com/eush77), [hemanth.hm](https://github.com/hemanth), [Paul Miller](https://github.com/paulmillr), [Denis Malinochkin](https://github.com/mrmlnc) and [many others](https://github.com/micromatch/braces/graphs/contributors).

The fork is maintained by [Francisco Solis](https://github.com/Im-Fran).

---

## 📄 License

Released under the [MIT License](LICENSE).

Copyright © 2014-present, Jon Schlinkert.
Copyright © 2026-present, Francisco Solis (fork).

---

<div align="center">
Made with ☕ by <a href="https://franciscosolis.cl">Fran</a>, on top of the work of Jon Schlinkert and the braces contributors.
</div>
