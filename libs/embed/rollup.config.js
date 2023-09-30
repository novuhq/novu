const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const sourceMaps = require('rollup-plugin-sourcemaps');
const camelCase = require('lodash.camelcase');
const typescript = require('rollup-plugin-typescript2');
const json = require('rollup-plugin-json');
const replace = require('@rollup/plugin-replace');

const pkg = require('./package.json');

const libraryName = 'embed';

module.exports = {
  input: `src/${libraryName}.ts`,
  output: [
    {
      file: pkg.main,
      name: camelCase(libraryName),
      format: 'iife',
      sourcemap: false,
      plugins: [],
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: false,
      plugins: [],
    },
  ],
  // Indicate here external modules you don't want to include in your bundle (i.e.: 'lodash')
  external: [],
  watch: {
    include: 'src/**',
  },
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        'process.env.ENVIRONMENT': JSON.stringify(process.env.ENVIRONMENT),
        'process.env.WIDGET_URL': JSON.stringify(process.env.WIDGET_URL),
      },
    }),
    // Allow json resolution
    json(),
    // Compile TypeScript files
    typescript({ useTsconfigDeclarationDir: true }),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs({ extensions: ['.js', '.ts'] }),
    /*
     * Allow node_modules resolution, so you can use 'external' to control
     * which external modules to include in the bundle
     * https://github.com/rollup/rollup-plugin-node-resolve#usage
     */
    resolve(),

    // Resolve source maps to the original source
    sourceMaps(),
  ],
};
