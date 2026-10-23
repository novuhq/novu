import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { HostId } from './host';

export type ChannelPlatform = 'telegram' | 'slack' | 'email' | string;

export interface CliConfig {
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
  defaultChannel?: ChannelPlatform;
  /**
   * The host this computer was connected for: the one the one-time code was made for, when the shell
   * `connect` ran in didn't say which host it was. Requests name it while the shell doesn't say either.
   */
  host?: HostId;
}

/**
 * The Agent Inbox site (`apps/human-dashboard`). It hosts the credential landing pages (`/connect#<token>`
 * for Telegram and Slack), and its `/api` forwards to Novu Cloud's API, so people only ever see this address.
 * The pages are only used with the default API: a self-hosted or local API falls back to the URL the server
 * itself returns (that deployment's own dashboard page).
 */
export const SETUP_PAGE_ORIGIN = 'https://www.agentinbox.md';

/** The API the CLI talks to unless told otherwise: the Agent Inbox API on agentinbox.md. */
export const DEFAULT_API_URL = `${SETUP_PAGE_ORIGIN}/api`;

/** The relay agent the API sets up by default. It is an API name, not shown to people. */
export const DEFAULT_RELAY_AGENT_IDENTIFIER = 'human-relay';

/** How people run the CLI. Every hint and error that names a command starts with it. */
export const CLI_COMMAND = 'npx @agentinbox/cli';

export const SUPPORTED_CHANNELS = ['telegram', 'slack', 'email'] as const;

export const NOT_SET_UP_MESSAGE = `No inbox set up yet. Ask your operator to run: ${CLI_COMMAND} setup (or set INBOX_SECRET_KEY + INBOX_TO).`;

export function configPath(): string {
  return process.env.INBOX_CONFIG ?? join(homedir(), '.agentinbox', 'config.json');
}

export function loadConfig(): CliConfig | null {
  try {
    const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as Partial<CliConfig>;

    return {
      ...raw,
      apiUrl: raw.apiUrl ?? DEFAULT_API_URL,
      relayAgentIdentifier: raw.relayAgentIdentifier ?? DEFAULT_RELAY_AGENT_IDENTIFIER,
    } as CliConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: CliConfig): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

/**
 * The API that `setup` and `login` save credentials for: `--api-url`, then INBOX_API_URL,
 * then the API the saved config already belongs to, so a later run keeps using the same region.
 */
export function resolveTargetApiUrl(apiUrlFlag: string | undefined, saved: CliConfig | null): string {
  return (apiUrlFlag || process.env.INBOX_API_URL?.trim() || saved?.apiUrl || DEFAULT_API_URL).replace(/\/$/, '');
}

/**
 * Resolve the effective config for a command run. Environment variables win
 * over the config file so agents can run headless without `setup`
 * having been executed on the same machine (e.g. CI with INBOX_SECRET_KEY).
 */
export function resolveConfig(overrides?: { apiUrl?: string }): CliConfig {
  const file = loadConfig();
  const secretKey = process.env.INBOX_SECRET_KEY?.trim();

  let config: CliConfig | null = null;
  if (secretKey) {
    config = {
      ...(file ?? {
        apiUrl: DEFAULT_API_URL,
        relayAgentIdentifier: DEFAULT_RELAY_AGENT_IDENTIFIER,
      }),
      auth: { mode: 'apiKey', secretKey },
    };
  } else if (file) {
    config = { ...file };
  }

  if (!config) {
    throw new Error(NOT_SET_UP_MESSAGE);
  }

  if (overrides?.apiUrl) {
    config.apiUrl = overrides.apiUrl;
  }

  if (process.env.INBOX_API_URL) {
    config.apiUrl = overrides?.apiUrl ?? process.env.INBOX_API_URL;
  }

  return config;
}

/**
 * Channel preference for create: `--via` wins, then INBOX_VIA, then the saved
 * default channel. The caller decides which defaults apply to the recipients
 * (see `channelDefaultsFor`); for anyone else the API uses that person's own
 * default channel. When none applies, returns undefined and the API picks.
 */
export function resolveVia(
  config: CliConfig,
  via?: string,
  { useEnvVia = true, useSavedDefault = true }: { useEnvVia?: boolean; useSavedDefault?: boolean } = {}
): ChannelPlatform | undefined {
  if (via) {
    return via.toLowerCase();
  }

  const envVia = useEnvVia ? process.env.INBOX_VIA?.trim().toLowerCase() : undefined;
  if (envVia) {
    if (!(SUPPORTED_CHANNELS as readonly string[]).includes(envVia)) {
      throw new Error(`Invalid INBOX_VIA "${envVia}". Use one of: ${SUPPORTED_CHANNELS.join(', ')}.`);
    }

    return envVia;
  }

  return useSavedDefault ? config.defaultChannel : undefined;
}
