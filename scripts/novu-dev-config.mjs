#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';
import {
  CONFIG_PATH,
  configExists,
  formatNgrokSummary,
  isPortlessSetupNeeded,
  loadConfig,
  saveConfig,
} from './novu-dev-local.mjs';
import { normalizeNgrokDomain } from './portless-ngrok.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function isNgrokOnPath() {
  try {
    execFileSync('ngrok', ['version'], { stdio: ['ignore', 'ignore', 'ignore'] });

    return true;
  } catch {
    return false;
  }
}

function runPortlessSetup() {
  process.stdout.write('\nRunning pnpm portless:setup...\n\n');

  const result = spawnSync('pnpm', ['portless:setup'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  return result.status === 0;
}

async function promptReservedDomain() {
  while (true) {
    const { domainInput } = await inquirer.prompt([
      {
        type: 'input',
        name: 'domainInput',
        message: 'Reserved ngrok domain (e.g. my-api.ngrok.app):',
        validate(value) {
          const normalized = normalizeNgrokDomain(value);

          if (!normalized) {
            return 'Enter a valid ngrok domain or https:// URL';
          }

          return true;
        },
      },
    ]);

    const domain = normalizeNgrokDomain(domainInput);

    if (domain) {
      return domain;
    }
  }
}

export async function runWizard({ isFirstRun = false } = {}) {
  const existing = loadConfig();
  const existingNgrok = existing.portless?.ngrok ?? { enabled: false, domain: null };

  if (isFirstRun) {
    process.stdout.write('\nWelcome to Novu local dev setup.\n');
    process.stdout.write('This one-time wizard saves preferences to .novu-dev.local.json\n\n');
  }

  if (isPortlessSetupNeeded()) {
    const { runSetup } = await inquirer.prompt([
      {
        type: 'list',
        name: 'runSetup',
        message: 'Portless does not appear set up yet. Run pnpm portless:setup now?',
        choices: ['Yes', 'No'],
        default: 'Yes',
      },
    ]);

    if (runSetup === 'Yes') {
      runPortlessSetup();
    }
  }

  const { ngrokEnabled } = await inquirer.prompt([
    {
      type: 'list',
      name: 'ngrokEnabled',
      message: 'Use ngrok for agent webhooks/OAuth by default?',
      choices: ['Yes', 'No'],
      default: existingNgrok.enabled ? 'Yes' : 'No',
    },
  ]);

  const enabled = ngrokEnabled === 'Yes';
  let domain = null;

  if (enabled) {
    const { domainMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'domainMode',
        message: 'Ngrok tunnel URL:',
        choices: [
          { name: 'Random URL (portless-managed)', value: 'random' },
          { name: 'Reserved domain', value: 'reserved' },
        ],
        default: existingNgrok.domain ? 'reserved' : 'random',
      },
    ]);

    if (domainMode === 'reserved') {
      domain = await promptReservedDomain();
    }

    if (!isNgrokOnPath()) {
      process.stdout.write(
        '\n[novu-dev-config] Warning: ngrok CLI not found on PATH. Install from https://ngrok.com/download\n'
      );
    }
  }

  const config = {
    ...existing,
    portless: {
      ...existing.portless,
      ngrok: {
        enabled,
        domain,
      },
    },
  };

  saveConfig(config);

  process.stdout.write(`\nSaved to ${CONFIG_PATH}\n`);
  process.stdout.write(`  ngrok: ${formatNgrokSummary(config)}\n\n`);
  process.stdout.write('Restart: pnpm dev:portless\n');
  process.stdout.write('Change later: pnpm dev:config  or  mprocs → DEV CONFIG\n\n');

  return config;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isCli) {
  runWizard({ isFirstRun: !configExists() }).catch((err) => {
    console.error('[novu-dev-config] failed:', err.message);
    process.exit(1);
  });
}
