import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import nodePolyfills from 'rollup-plugin-node-polyfills'
// import builtins from 'rollup-plugin-node-builtins';
// import globals from 'rollup-plugin-node-globals';

export default {
  context: 'this',
  plugins: [
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    // globals(),
    // builtins(),
    commonjs({requireReturnsDefault:true}),
    nodePolyfills({ buffer: true, crypto: true, process: true }),
  ],
}
