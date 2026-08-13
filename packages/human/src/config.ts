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
  /** Platforms the human has linked; `human setup <channel>` appends here. */
  channels?: HumanChannelPlatform[];
  /** Platform used when the caller passes no `--via`. */
  defaultChannel?: HumanChannelPlatform;
}

export const DEFAULT_API_URL = 'https://api.novu.co';
export const DEFAULT_RELAY_AGENT_IDENTIFIER = 'human-relay';

export const NOT_SET_UP_MESSAGE =
  'No human connected yet. Ask your human to run: npx @novu/human setup (or set NOVU_SECRET_KEY).';

export function configPath(): string {
  return process.env.NOVU_HUMAN_CONFIG ?? join(homedir(), '.novu', 'human.json');
}

/**
 * Normalize older config shapes that stored `{ platform, integrationIdentifier }`
 * or a single `defaultHuman` block into the current platform-only list.
 */
function migrate(raw: Record<string, unknown>): HumanCliConfig {
  const channels: HumanChannelPlatform[] = [];

  if (Array.isArray(raw.channels)) {
    for (const entry of raw.channels) {
      if (typeof entry === 'string') {
        channels.push(entry);
      } else if (entry && typeof entry === 'object' && 'platform' in entry) {
        channels.push(String((entry as { platform: string }).platform));
      }
    }
  }

  const legacy = raw.defaultHuman as { subscriberId?: string; platform?: string } | undefined;
  if (legacy?.platform && !channels.includes(legacy.platform)) {
    channels.push(legacy.platform);
  }

  return {
    apiUrl: String(raw.apiUrl ?? DEFAULT_API_URL),
    auth: raw.auth as HumanCliConfig['auth'],
    relayAgentIdentifier: String(raw.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER),
    subscriberId: (raw.subscriberId as string | undefined) ?? legacy?.subscriberId,
    channels: channels.length > 0 ? channels : undefined,
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
 * agents normally never pass `--via`. Returns the platform name the API accepts
 * as `via`.
 */
export function resolveChannel(config: HumanCliConfig, via?: string): HumanChannelPlatform {
  const channels = config.channels ?? [];

  if (channels.length === 0) {
    throw new Error(NOT_SET_UP_MESSAGE);
  }

  if (via) {
    const match = channels.find((channel) => channel === via.toLowerCase());
    if (!match) {
      const linked = channels.join(', ');
      throw new Error(
        `No ${via} channel is linked (linked: ${linked}). Ask your human to run: npx @novu/human setup ${via.toLowerCase()}`
      );
    }

    return match;
  }

  const preferred = channels.find((channel) => channel === config.defaultChannel);

  return preferred ?? channels[0];
}
