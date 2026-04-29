#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

await build({
  entryPoints: [resolve(root, 'src/commands/wizard/ui/index.tsx')],
  outfile: resolve(root, 'dist/src/commands/wizard/ui/index.mjs'),
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
  ],
  banner: {
    js: [
      "import { createRequire as __wizardCreateRequire } from 'node:module';",
      "import { fileURLToPath as __wizardFileURLToPath } from 'node:url';",
      "import { dirname as __wizardDirname } from 'node:path';",
      'const require = __wizardCreateRequire(import.meta.url);',
      'const __filename = __wizardFileURLToPath(import.meta.url);',
      'const __dirname = __wizardDirname(__filename);',
    ].join(' '),
  },
});
