import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeNgrokDomain } from './portless-ngrok.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const CONFIG_PATH = join(root, '.novu-dev.local.json');

export const DEFAULT_CONFIG = {
  portless: {
    ngrok: {
      enabled: false,
      domain: null,
    },
  },
};

export function configExists() {
  return existsSync(CONFIG_PATH);
}

export function loadConfig() {
  if (!configExists()) {
    return structuredClone(DEFAULT_CONFIG);
  }

  try {
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

    return {
      ...structuredClone(DEFAULT_CONFIG),
      ...parsed,
      portless: {
        ...DEFAULT_CONFIG.portless,
        ...parsed.portless,
        ngrok: {
          ...DEFAULT_CONFIG.portless.ngrok,
          ...parsed.portless?.ngrok,
        },
      },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveConfig(config) {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`);
}

export function isPortlessSetupNeeded() {
  const caPath = join(process.env.PORTLESS_STATE_DIR || join(homedir(), '.portless'), 'ca.pem');

  if (!existsSync(caPath)) {
    return true;
  }

  try {
    execFileSync('pnpm', ['exec', 'portless', '--version'], {
      cwd: root,
      stdio: ['ignore', 'ignore', 'ignore'],
    });

    return false;
  } catch {
    return true;
  }
}

function envExplicitlySetsNgrok(env) {
  return env.PORTLESS_NGROK === '1' || env.PORTLESS_NGROK === '0' || Boolean(env.PORTLESS_NGROK_DOMAIN?.trim());
}

export function resolveNgrokEnv(config, env = process.env) {
  const ngrok = config.portless?.ngrok ?? DEFAULT_CONFIG.portless.ngrok;
  let enabled = ngrok.enabled ?? false;
  let domain = ngrok.domain ?? null;

  if (env.PORTLESS_NGROK === '1') {
    enabled = true;
  }

  if (env.PORTLESS_NGROK === '0') {
    enabled = false;
    domain = null;
  }

  if (env.PORTLESS_NGROK_DOMAIN?.trim()) {
    domain = normalizeNgrokDomain(env.PORTLESS_NGROK_DOMAIN) ?? null;
    enabled = Boolean(domain);
  }

  const resolved = {
    API_PORTLESS_SCRIPT: enabled ? 'start:portless:ngrok' : 'start:portless',
  };

  if (enabled) {
    resolved.PORTLESS_NGROK = '1';

    if (domain) {
      resolved.PORTLESS_NGROK_DOMAIN = domain;
    }
  }

  return { enabled, domain, resolved, overridden: envExplicitlySetsNgrok(env) };
}

export function formatNgrokSummary(config) {
  const ngrok = config.portless?.ngrok ?? DEFAULT_CONFIG.portless.ngrok;

  if (!ngrok.enabled) {
    return 'disabled';
  }

  if (ngrok.domain) {
    return `enabled (reserved domain: ${ngrok.domain})`;
  }

  return 'enabled (random URL)';
}
