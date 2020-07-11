
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import image from '@rollup/plugin-image'

export default {
  input: 'main.js',
  output: {
    dir: 'out',
    format: 'iife'
  },
  plugins: [resolve(),commonjs(),image()]
}
