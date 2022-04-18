import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import sourceMaps from 'rollup-plugin-sourcemaps';
import camelCase from 'lodash.camelcase';
import typescript from 'rollup-plugin-typescript2';
import json from 'rollup-plugin-json';
import replace from '@rollup/plugin-replace';

const pkg = require('./package.json');

const libraryName = 'embed';

export default {
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
