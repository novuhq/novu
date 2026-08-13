import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export type HumanChannelPlatform = 'telegram' | 'slack' | 'email' | string;

export interface HumanCliConfig {
  apiUrl: string;
  auth: {
    mode: 'keyless' | 'apiKey';
    keylessIdentifier?: string;
    secretKey?: string;
  };
  relayAgentIdentifier: string;
  subscriberId?: string;
  /**
   * Preferred delivery platform when the caller does not pass `--via`.
   * Linked channels themselves live on the server (relay integrations +
   * endpoints) — this is only a local preference.
   */
  defaultChannel?: HumanChannelPlatform;
}

export const DEFAULT_API_URL = 'https://api.novu.co';
export const DEFAULT_RELAY_AGENT_IDENTIFIER = 'human-relay';

export const NOT_SET_UP_MESSAGE =
  'No human connected yet. Ask your human to run: npx @novu/human setup (or set NOVU_SECRET_KEY).';

export function configPath(): string {
  return process.env.NOVU_HUMAN_CONFIG ?? join(homedir(), '.novu', 'human.json');
}

/** Drop obsolete local channel lists; keep auth + preference fields. */
function migrate(raw: Record<string, unknown>): HumanCliConfig {
  const legacy = raw.defaultHuman as { subscriberId?: string; platform?: string } | undefined;

  return {
    apiUrl: String(raw.apiUrl ?? DEFAULT_API_URL),
    auth: raw.auth as HumanCliConfig['auth'],
    relayAgentIdentifier: String(raw.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER),
    subscriberId: (raw.subscriberId as string | undefined) ?? legacy?.subscriberId,
    defaultChannel: (raw.defaultChannel as string | undefined) ?? legacy?.platform,
  };
}

export function loadConfig(): HumanCliConfig | null {
  try {
    return migrate(JSON.parse(readFileSync(configPath(), 'utf8')) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function saveConfig(config: HumanCliConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  const { channels: _ignored, ...persisted } = config as HumanCliConfig & { channels?: unknown };
  writeFileSync(path, `${JSON.stringify(persisted, null, 2)}\n`, { mode: 0o600 });
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
    throw new Error(NOT_SET_UP_MESSAGE);
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

/**
 * Channel preference for create: `--via` wins, otherwise the configured
 * default. When neither is set, returns undefined and the API picks the sole
 * linked channel (or errors if several are linked).
 */
export function resolveVia(config: HumanCliConfig, via?: string): HumanChannelPlatform | undefined {
  if (via) {
    return via.toLowerCase();
  }

  return config.defaultChannel;
}
