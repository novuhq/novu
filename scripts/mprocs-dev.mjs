#!/usr/bin/env node
/**
 * Run mprocs with optional ngrok-only procs appended to mprocs.yaml.
 *
 * Usage: node scripts/mprocs-dev.mjs
 * Ngrok: PORTLESS_NGROK=1 node scripts/mprocs-dev.mjs
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseConfigPath = join(root, 'mprocs.yaml');

const NGROK_PROCS = `
  "------":
    shell: sleep infinity
    autostart: false
  "API PUBLIC URL":
    shell: node scripts/portless-ngrok.mjs watch api.novu
`;

function buildConfigPath() {
  const base = readFileSync(baseConfigPath, 'utf8');
  const ngrok = process.env.PORTLESS_NGROK === '1';

  if (!ngrok) {
    return baseConfigPath;
  }

  const merged = base.replace(/^scrollback:/m, `${NGROK_PROCS}scrollback:`);
  const generatedPath = join(tmpdir(), 'novu-mprocs-ngrok.yaml');

  writeFileSync(generatedPath, merged);

  return generatedPath;
}

function main() {
  const configPath = buildConfigPath();
  const child = spawn('pnpm', ['exec', 'mprocs', '-c', configPath], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);

      return;
    }

    process.exit(code ?? 0);
  });

  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => child.kill(sig));
  }
}

main();
