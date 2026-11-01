#!/usr/bin/env node

import fs from 'node:fs';

// A missing package fails the CLI's imports before any of its code runs, with Node's own stack trace.
if (!fs.existsSync(new URL('../../node_modules/zod', import.meta.url))) {
  console.error('[cli] ERROR: docker/box/node_modules is missing; run `npm ci --prefix docker/box` once');
  process.exit(1);
}
await import('./box.ts');
