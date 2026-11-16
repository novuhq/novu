/** biome-ignore-all lint/style/noCommonJs: `mocha --require` and `node -r` load this file before any TypeScript loader exists */
const fs = require('node:fs');
const Module = require('node:module');
const { registerHooks } = Module;
const { fileURLToPath } = require('node:url');
const { transformSync } = require('@swc/core');

const NOT_FOUND_CODES = new Set(['MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'ERR_UNSUPPORTED_DIR_IMPORT']);

process.setSourceMapsEnabled(true);

// `require.resolve` skips the resolve hook below, so `.ts` must also be a known CommonJS extension for it to find
// extensionless `.ts` paths. The `.js` handler still takes its source from the load hook, so SWC compiles the file.
Module._extensions['.ts'] = Module._extensions['.js'];

// Module hooks rather than a `require.extensions` hook: Mocha retries a spec that throws on `require()` with
// `import()`, and without these hooks Node's type stripping would load it there, with no decorator metadata.
registerHooks({
  // Node doesn't try `.ts` for extensionless specifiers, so `import '../src/bootstrap'` and
  // `import '@novu/ee-billing/src/stripe/types'` need this fallback.
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!NOT_FOUND_CODES.has(error.code)) throw error;

      for (const suffix of ['.ts', '/index.ts']) {
        try {
          return nextResolve(specifier + suffix, context);
        } catch {}
      }

      throw error;
    }
  },
  load(url, context, nextLoad) {
    if (!url.startsWith('file:') || !url.endsWith('.ts') || url.includes('/node_modules/')) {
      return nextLoad(url, context);
    }

    const filename = fileURLToPath(url);
    // The options `nest build` compiles the apps with (Nest's SWC defaults), so tests run the same JavaScript as production.
    const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
      filename,
      sourceMaps: 'inline',
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
    });

    return { format: 'commonjs', source: code, shortCircuit: true };
  },
});
