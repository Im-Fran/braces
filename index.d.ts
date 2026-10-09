/**
 * Expand the given pattern(s), or create regex-compatible strings when
 * `options.expand` is not `true`.
 */
declare function braces(input: string | string[], options?: braces.Options): string[];

declare namespace braces {
  type Transform = (value: number, index: number) => string;

  interface Options {
    /** Maximum input length. Values above 10,000 are capped. Default: `10000`. */
    maxLength?: number;
    /** Maximum brace nesting depth. Default: `100`. */
    maxDepth?: number;
    /** Return an array of expanded strings instead of a regex-compatible string. */
    expand?: boolean;
    /** Remove duplicates from the result. */
    nodupes?: boolean;
    /** Remove empty strings from the result of `expand`. */
    noempty?: boolean;
    /** Maximum number of items a range may expand to. Default: `1000`. */
    rangeLimit?: number;
    /** Step used for ranges that do not define one. */
    step?: number;
    /** Customize range expansion. Receives a char code for non-numeric ranges. */
    transform?: Transform;
    /** Leave regex quantifiers such as `a{1,3}` unexpanded. */
    quantifiers?: boolean;
    /** Keep the backslashes used for escaping in the result. */
    keepEscaping?: boolean;
    /** Keep quotes around quoted strings in the result. */
    keepQuotes?: boolean;
    /** Escape invalid braces when compiling. */
    escapeInvalid?: boolean;
  }

  type NodeType =
    | 'root'
    | 'bos'
    | 'eos'
    | 'text'
    | 'paren'
    | 'brace'
    | 'open'
    | 'close'
    | 'comma'
    | 'dot'
    | 'range';

  interface Node {
    type: NodeType;
    value?: string;
    nodes?: Node[];
    parent?: Node;
    prev?: Node;
    /** Only on the `root` node. */
    input?: string;
    /** The fields below are only set on `brace` nodes. */
    open?: boolean;
    close?: boolean;
    dollar?: boolean;
    depth?: number;
    commas?: number;
    ranges?: number;
    invalid?: boolean;
  }

  /** Parse a brace pattern into an AST. */
  function parse(input: string, options?: Options): Node;
  /** Turn an AST, or a pattern, back into a string. */
  function stringify(input: string | Node, options?: Options): string;
  /** Compile a pattern, or an AST, into a regex-compatible string. */
  function compile(input: string | Node, options?: Options): string;
  /** Expand a pattern, or an AST, into an array of strings. */
  function expand(input: string | Node, options?: Options): string[];
  /**
   * Run `compile`, or `expand` when `options.expand` is `true`. Inputs shorter
   * than 3 characters are returned as `[input]`.
   */
  function create(input: string, options?: Options): string | string[];
}

export = braces;
