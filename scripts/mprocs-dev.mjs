#!/usr/bin/env node
/**
 * Run mprocs with ngrok settings from .novu-dev.local.json (and env overrides).
 *
 * Usage: node scripts/mprocs-dev.mjs
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWizard } from './novu-dev-config.mjs';
import { configExists, loadConfig, resolveNgrokEnv } from './novu-dev-local.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const baseConfigPath = join(root, 'mprocs.yaml');

const NGROK_URL_PROC = `
  "API PUBLIC URL":
    shell: node scripts/portless-ngrok.mjs watch api.novu
`;

function buildConfigPath(ngrokEnabled) {
  const base = readFileSync(baseConfigPath, 'utf8');

  if (!ngrokEnabled) {
    return baseConfigPath;
  }

  const merged = base.replace(/^scrollback:/m, `${NGROK_URL_PROC}scrollback:`);
  const generatedPath = join(tmpdir(), 'novu-mprocs-ngrok.yaml');

  writeFileSync(generatedPath, merged);

  return generatedPath;
}

function applyResolvedEnv(resolved) {
  process.env.API_PORTLESS_SCRIPT = resolved.API_PORTLESS_SCRIPT;

  if (resolved.PORTLESS_NGROK) {
    process.env.PORTLESS_NGROK = resolved.PORTLESS_NGROK;
  } else {
    delete process.env.PORTLESS_NGROK;
  }

  if (resolved.PORTLESS_NGROK_DOMAIN) {
    process.env.PORTLESS_NGROK_DOMAIN = resolved.PORTLESS_NGROK_DOMAIN;
  } else {
    delete process.env.PORTLESS_NGROK_DOMAIN;
  }
}

async function main() {
  if (!configExists() && process.stdin.isTTY) {
    await runWizard({ isFirstRun: true });
  }

  const config = loadConfig();
  const { enabled, resolved } = resolveNgrokEnv(config);

  applyResolvedEnv(resolved);

  const configPath = buildConfigPath(enabled);
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

main().catch((err) => {
  console.error('[mprocs-dev] failed:', err.message);
  process.exit(1);
});
