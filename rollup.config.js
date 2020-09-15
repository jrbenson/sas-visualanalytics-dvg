import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default {
    input: "./lib/index.js",
    output: {
        file: "dist/vadynsvg.js",
        name: "dynsvg",
        format: "iife"
    },
    plugins: [nodeResolve(), commonjs()]
}