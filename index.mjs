// ESM entry point. Re-exports the CommonJS build so both module systems share
// a single instance.
import braces from './index.js';

export const { parse, stringify, compile, expand, create } = braces;
export default braces;
