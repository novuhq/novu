import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import dts from 'rollup-plugin-dts';
import { terser } from 'rollup-plugin-terser';
import image from '@rollup/plugin-image';
import nodeExternals from 'rollup-plugin-node-externals';
import replace from '@rollup/plugin-replace';
import gzipPlugin from 'rollup-plugin-gzip';

const packageJson = require('./package.json');

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      nodeExternals(),
      resolve({ preferBuiltins: false, browser: true }),
      commonjs(),
      typescript({ tsconfig: './tsconfig.json' }),
      terser(),
      image(),
    ],
  },
  {
    input: 'src/web-component.ts',
    external: ['react@17.0.2', 'react-dom@17.0.2'],
    output: [
      {
        file: 'dist/umd/index.js',
        format: 'umd',
        name: 'NotificationCenterWebComponent',
        sourcemap: true,
      },
    ],
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      resolve({ preferBuiltins: false, browser: true }),
      typescript({ tsconfig: './tsconfig.json' }),
      commonjs(),
      terser(),
      gzipPlugin(),
      image(),
    ],
  },
  {
    input: 'dist/esm/types/index.d.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
  },
];
