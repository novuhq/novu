import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export interface HumanChannel {
  platform: string;
  integrationIdentifier: string;
}

export interface HumanCliConfig {
  apiUrl: string;
  auth: {
    mode: 'keyless' | 'apiKey';
    keylessIdentifier?: string;
    secretKey?: string;
  };
  relayAgentIdentifier: string;
  subscriberId?: string;
  /** Channels the human has linked; `human setup <channel>` appends here. */
  channels?: HumanChannel[];
  /** Platform used when the caller passes no `--via`. */
  defaultChannel?: string;
  /** Legacy single-channel shape (pre multi-channel) — migrated on load. */
  defaultHuman?: {
    subscriberId: string;
    integrationIdentifier: string;
    platform: string;
  };
}

export const DEFAULT_API_URL = 'https://api.novu.co';
export const DEFAULT_RELAY_AGENT_IDENTIFIER = 'human-relay';

export const NOT_SET_UP_MESSAGE =
  'No human connected yet. Ask your human to run: npx @novu/human setup (or set NOVU_SECRET_KEY).';

export function configPath(): string {
  return process.env.NOVU_HUMAN_CONFIG ?? join(homedir(), '.novu', 'human.json');
}

/** Folds the legacy `defaultHuman` shape into `subscriberId` + `channels`. */
function migrate(config: HumanCliConfig): HumanCliConfig {
  if (!config.defaultHuman) {
    return config;
  }

  const legacy = config.defaultHuman;
  const channels = config.channels ?? [];
  const hasLegacyChannel = channels.some((channel) => channel.platform === legacy.platform);

  return {
    ...config,
    subscriberId: config.subscriberId ?? legacy.subscriberId,
    channels: hasLegacyChannel
      ? channels
      : [...channels, { platform: legacy.platform, integrationIdentifier: legacy.integrationIdentifier }],
    defaultChannel: config.defaultChannel ?? legacy.platform,
    defaultHuman: undefined,
  };
}

export function loadConfig(): HumanCliConfig | null {
  try {
    return migrate(JSON.parse(readFileSync(configPath(), 'utf8')) as HumanCliConfig);
  } catch {
    return null;
  }
}

export function saveConfig(config: HumanCliConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  const { defaultHuman: _legacy, ...persisted } = config;
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
 * Pick the channel an interaction should deliver on: `--via <platform>` wins,
 * otherwise the configured default. Channel choice is the human's preference —
 * agents normally never pass `--via`.
 */
export function resolveChannel(config: HumanCliConfig, via?: string): HumanChannel {
  const channels = config.channels ?? [];

  if (channels.length === 0) {
    throw new Error(NOT_SET_UP_MESSAGE);
  }

  if (via) {
    const match = channels.find((channel) => channel.platform === via.toLowerCase());
    if (!match) {
      const linked = channels.map((channel) => channel.platform).join(', ');
      throw new Error(
        `No ${via} channel is linked (linked: ${linked}). Ask your human to run: npx @novu/human setup ${via.toLowerCase()}`
      );
    }

    return match;
  }

  const preferred = channels.find((channel) => channel.platform === config.defaultChannel);

  return preferred ?? channels[0];
}
