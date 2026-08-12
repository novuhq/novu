import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface HumanCliConfig {
  apiUrl: string;
  auth: {
    mode: 'keyless' | 'apiKey';
    keylessIdentifier?: string;
    secretKey?: string;
  };
  relayAgentIdentifier: string;
  defaultHuman?: {
    subscriberId: string;
    integrationIdentifier: string;
    platform: string;
  };
}

export const DEFAULT_API_URL = 'https://api.novu.co';
export const DEFAULT_RELAY_AGENT_IDENTIFIER = 'human-relay';

export function configPath(): string {
  return process.env.NOVU_HUMAN_CONFIG ?? join(homedir(), '.novu', 'human.json');
}

export function loadConfig(): HumanCliConfig | null {
  try {
    return JSON.parse(readFileSync(configPath(), 'utf8')) as HumanCliConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: HumanCliConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

/**
 * Resolve the effective config for a command run. Environment variables win
 * over the config file so agents can run headless without `human setup`
 * having been executed on the same machine (e.g. CI with NOVU_SECRET_KEY).
 */
export function resolveConfig(overrides?: { apiUrl?: string }): HumanCliConfig {
  const file = loadConfig();
  const secretKey = process.env.NOVU_SECRET_KEY?.trim();

  const config: HumanCliConfig | null = file
    ? { ...file }
    : secretKey
      ? {
          apiUrl: DEFAULT_API_URL,
          auth: { mode: 'apiKey', secretKey },
          relayAgentIdentifier: DEFAULT_RELAY_AGENT_IDENTIFIER,
        }
      : null;

  if (!config) {
    throw new Error('Not set up yet. Run `npx @novu/human setup` first (or set NOVU_SECRET_KEY).');
  }

  if (secretKey && config.auth.mode === 'apiKey') {
    config.auth.secretKey = secretKey;
  }

  if (overrides?.apiUrl) {
    config.apiUrl = overrides.apiUrl;
  }

  if (process.env.NOVU_API_URL) {
    config.apiUrl = overrides?.apiUrl ?? process.env.NOVU_API_URL;
  }

  return config;
}
