import { defineConfig, Options } from 'tsup';
import { solidPlugin } from 'esbuild-plugin-solid';
import { name, version } from './package.json';
import inlineImportPlugin from 'esbuild-plugin-inline-import';
import loadPostcssConfig from 'postcss-load-config';
import postcss from 'postcss';

const processCSS = async (css: string, filePath: string) => {
  const { plugins, options } = await loadPostcssConfig({}, filePath);
  const result = await postcss(plugins).process(css, { ...options, from: filePath });
  return result.css;
};

const runAfterLast =
  (commands: Array<string | false>) =>
  (...configs: Options[]) => {
    const [last, ...rest] = configs.reverse();
    return [...rest.reverse(), { ...last, onSuccess: [last.onSuccess, ...commands].filter(Boolean).join(' && ') }];
  };

const isProd = process.env?.NODE_ENV === 'production';

const baseConfig: Options = {
  splitting: true,
  sourcemap: false,
  clean: true,
  dts: true,
  esbuildPlugins: [
    inlineImportPlugin({
      filter: /^directcss:/,
      transform: async (contents, args) => {
        const processedCss = processCSS(contents, args.path);
        return processedCss;
      },
    }),
    solidPlugin(),
  ],
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"`, __DEV__: `${!isProd}` },
};

const baseModuleConfig: Options = {
  ...baseConfig,
  treeshake: true,
  dts: false,
  define: { PACKAGE_NAME: `"${name}"`, PACKAGE_VERSION: `"${version}"`, __DEV__: `${!isProd}` },
  entry: {
    index: './src/index.ts',
    'ui/index': './src/ui/index.ts',
  },
  outExtension: ({ format }) => {
    return {
      js: format === 'cjs' ? '.cjs' : '.mjs',
    };
  },
};

export default defineConfig((config: Options) => {
  const copyPackageJson = (format: 'esm' | 'cjs') => `cp ./package.${format}.json ./dist/${format}/package.json`;

  const cjs: Options = {
    ...baseModuleConfig,
    format: 'esm',
    outDir: 'dist/esm',
    tsconfig: 'tsconfig.json',
  };

  const esm: Options = {
    ...baseModuleConfig,
    format: 'cjs',
    outDir: 'dist/cjs',
    tsconfig: 'tsconfig.cjs.json',
  };

  return runAfterLast([copyPackageJson('esm'), copyPackageJson('cjs')])(esm, cjs);
});
