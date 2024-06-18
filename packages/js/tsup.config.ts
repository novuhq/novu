import { defineConfig, Options } from 'tsup';
// import { compress } from 'esbuild-plugin-compress';
import glob from 'tiny-glob';
import * as preset from 'tsup-preset-solid';
import { name, version } from './package.json';

const isProd = process.env?.NODE_ENV === 'production';

const baseConfig: Options = {
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: true,
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"`, __DEV__: `${!isProd}` },
};

const baseModuleConfig: Options = {
  ...baseConfig,
  treeshake: true,
  dts: false,
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"`, __DEV__: `${!isProd}` },
  entry: await glob('./src/**/!(*.d|*.test).ts'),
  outExtension: ({ format }) => {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
};

const uiPresetOptions: preset.PresetOptions = {
  entries: [
    {
      // entries with '.tsx' extension will have `solid` export condition generated
      entry: 'src/ui/index.tsx',
    },
  ],
  out_dir: 'dist/ui',
  // Set to `true` to remove all `console.*` calls and `debugger` statements in prod builds
  drop_console: true,
  // Set to `true` to generate a CommonJS build alongside ESM
  cjs: true,
};

export default defineConfig((config: Options) => {
  const isWatching = !!config.watch;

  const PARSED_DATA = preset.parsePresetOptions(uiPresetOptions, isWatching);

  return [
    {
      ...baseModuleConfig,
      format: 'esm',
      outDir: 'dist/esm',
      tsconfig: 'tsconfig.json',
    },
    {
      ...baseModuleConfig,
      format: 'cjs',
      outDir: 'dist/cjs',
      tsconfig: 'tsconfig.cjs.json',
    },
    ...preset.generateTsupOptions(PARSED_DATA),
    // {
    //   ...baseConfig,
    //   entry: { novu: 'src/umd.ts' },
    //   format: ['iife'],
    //   minify: true,
    //   dts: false,
    //   outExtension: () => {
    //     return {
    //       js: '.min.js',
    //     };
    //   },
    //   esbuildPlugins: [
    //     compress({
    //       gzip: true,
    //       brotli: false,
    //       outputDir: '.',
    //       exclude: ['**/*.map'],
    //     }),
    //   ],
    // },
  ];
});
