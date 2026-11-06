/** biome-ignore-all lint/style/noCommonJs: <explanation> */
const { transformSync } = require('@swc/core');
const { addHook } = require('pirates');

// The options `nest build` compiles the API with (Nest's SWC defaults), so e2e runs the same JavaScript as production.
addHook(
  (code, filename) =>
    transformSync(code, {
      filename,
      jsc: {
        target: 'es2021',
        parser: {
          syntax: 'typescript',
          decorators: true,
          dynamicImport: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
          useDefineForClassFields: false,
        },
        keepClassNames: true,
      },
      module: {
        type: 'commonjs',
      },
    }).code,
  { exts: ['.ts'] }
);
