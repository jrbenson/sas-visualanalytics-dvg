import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import { terser } from 'rollup-plugin-terser'

export default [
  {
    input: './lib/index.js',
    output: {
      file: 'dist/vadynsvg.js',
      name: 'dynsvg',
      format: 'iife',
    },
    plugins: [nodeResolve(), commonjs()],
  },
  {
    input: './lib/index.js',
    output: {
      file: 'dist/vadynsvg.min.js',
      name: 'dynsvg',
      format: 'iife',
    },
    plugins: [nodeResolve(), terser(), commonjs()],
  },
]
