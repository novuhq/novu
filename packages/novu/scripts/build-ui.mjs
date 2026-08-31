#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const sharedConfig = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node18'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  sourcemap: false,
  logLevel: 'info',
  external: [
    'react',
    'react/jsx-runtime',
    'ink',
    'ink-scroll-view',
    '@inkjs/ui',
    'ink-spinner',
    'chalk',
    'marked',
    'cli-highlight',
    'cli-table3',
    'diff',
    'clipboardy',
    'string-width',
    '@anthropic-ai/claude-agent-sdk',
    'open',
    'nanostores',
  ],
  banner: {
    js: [
      "import { createRequire as __novuCreateRequire } from 'node:module';",
      "import { fileURLToPath as __novuFileURLToPath } from 'node:url';",
      "import { dirname as __novuDirname } from 'node:path';",
      'const require = __novuCreateRequire(import.meta.url);',
      'const __filename = __novuFileURLToPath(import.meta.url);',
      'const __dirname = __novuDirname(__filename);',
    ].join(' '),
  },
};

await build({
  ...sharedConfig,
  entryPoints: [resolve(root, 'src/commands/wizard/ui/index.tsx')],
  outfile: resolve(root, 'dist/src/commands/wizard/ui/index.mjs'),
});

await build({
  ...sharedConfig,
  entryPoints: [resolve(root, 'src/commands/connect/ui/index.tsx')],
  outfile: resolve(root, 'dist/src/commands/connect/ui/index.mjs'),
});

/**
 * Bundle the CLI entry, replacing the tsc-emitted dist/src/index.js.
 *
 * Packages declared in `dependencies` stay external and install from npm.
 * Everything else — workspace packages like @novu/shared and their own deps —
 * is compiled into the bundle, so the published CLI can never skew against a
 * stale npm build of a workspace package (the UI bundles above already inline
 * @novu/shared for the same reason).
 */
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const npmDependencies = new Set(Object.keys(pkg.dependencies ?? {}));

const externalizeNpmDependencies = {
  name: 'externalize-npm-dependencies',
  setup(pluginBuild) {
    pluginBuild.onResolve({ filter: /^[^./]/ }, (args) => {
      const packageName = args.path.startsWith('@')
        ? args.path.split('/').slice(0, 2).join('/')
        : args.path.split('/')[0];
      if (npmDependencies.has(packageName)) {
        return { path: args.path, external: true };
      }

      // Fall through: workspace packages get bundled, node builtins stay
      // external via platform: 'node'.
      return null;
    });
  },
};

await build({
  entryPoints: [resolve(root, 'src/index.ts')],
  outfile: resolve(root, 'dist/src/index.js'),
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node18'],
  jsx: 'automatic',
  jsxImportSource: 'react',
  sourcemap: false,
  logLevel: 'info',
  plugins: [externalizeNpmDependencies],
});
