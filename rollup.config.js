import babel from '@rollup/plugin-babel'

export default {
    input: 'src/main.js',
    output: {
      file: 'springs.js',
      format: 'iife'
    },
    plugins: [babel({ babelHelpers: 'bundled' })]
  };