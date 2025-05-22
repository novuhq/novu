const { transformFileSync } = require('@swc/core');
const { addHook } = require('pirates');

require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'es5',
    esModuleInterop: false,
  },
});

addHook(
  (code, filename) => {
    try {
      const result = transformFileSync(filename, {
        jsc: {
          target: 'es5',
          parser: {
            syntax: 'typescript',
            tsx: true,
            decorators: true,
            dynamicImport: true,
          },
          transform: {
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
          keepClassNames: true,
        },
        module: {
          type: 'commonjs',
          strictMode: false,
          noInterop: false,
        },
        sourceMaps: 'inline',
        minify: false,
      });

      return result.code;
    } catch (error) {
      console.error(`Error transforming file ${filename}:`, error);

      return code;
    }
  },
  {
    exts: ['.ts', '.tsx'],
    matcher: (filename) => {
      if (filename.includes('.source')) {
        return false;
      }

      return filename.endsWith('.ts') || filename.endsWith('.tsx');
    },
  }
);
