import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';
import image from '@rollup/plugin-image';
import nodeExternals from 'rollup-plugin-node-externals';
import replace from '@rollup/plugin-replace';
import gzipPlugin from 'rollup-plugin-gzip';
import nodePolyfills from 'rollup-plugin-polyfill-node';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
// import bundleAnalyzer from 'rollup-plugin-bundle-analyzer';

function onwarn(warning, warn) {
  if (
    warning.code === "MODULE_LEVEL_DIRECTIVE" &&
    warning.message.includes(`"use client"`)
  ) {
    return;
  }
  warn(warning);
};

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist/cjs',
        format: 'cjs',
        interop: 'auto',
        preserveModules: true, // indicate not create a single-file
        preserveModulesRoot: 'src', // optional but useful to create a more plain folder structure
        sourcemap: true,
      },
      {
        dir: 'dist/esm',
        format: 'esm',
        preserveModules: true,
        preserveModulesRoot: 'src',
        sourcemap: true,
      },
    ],
    treeshake: 'smallest',
    plugins: [
      peerDepsExternal(),
      nodeExternals(),
      resolve({ preferBuiltins: false, browser: true }),
      typescript({ tsconfig: './tsconfig.json' }),
      commonjs(),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      image(),
      // bundleAnalyzer({ analyzerMode: 'static' }),
    ],
    onwarn
  },
  {
    input: 'src/web-component.ts',
    output: [
      {
        file: 'dist/umd/index.js',
        format: 'umd',
        name: 'NotificationCenterWebComponent',
        sourcemap: true,
      },
    ],
    treeshake: 'smallest',
    plugins: [
      resolve({ browser: true }),
      nodePolyfills(),
      typescript({ tsconfig: './tsconfig.json' }),
      commonjs(),
      replace({
        preventAssignment: true,
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      terser(),
      gzipPlugin(),
      image(),
      // bundleAnalyzer({ analyzerMode: 'static' }),
    ],
    onwarn
  },
];
