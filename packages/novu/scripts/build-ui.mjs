#!/usr/bin/env node
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
