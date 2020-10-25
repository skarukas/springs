import babel from '@rollup/plugin-babel'

export default {
    input: 'src/main.js',
    output: {
      file: 'bundle.js',
      format: 'iife'
    },
    plugins: [babel({ babelHelpers: 'bundled' })]
  };