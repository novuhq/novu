import fs from 'node:fs';
import { parseEnvFile, readProjectEnvValue, resolveProjectEnvPaths } from '../bridge/wire-env';

export type WebChatEnvInput = {
  projectDir: string;
  applicationIdentifier: string;
  subscriberId: string;
  agentIdentifier: string;
  apiUrl: string;
};

export type WebChatEnvMergeResult = {
  envPaths: string[];
  updatedKeys: string[];
};

const WEB_CHAT_ENV_KEYS = [
  'NEXT_PUBLIC_NOVU_APP_ID',
  'NEXT_PUBLIC_NOVU_SUBSCRIBER_ID',
  'NEXT_PUBLIC_NOVU_AGENT_ID',
  'NEXT_PUBLIC_NOVU_BACKEND_URL',
  'NEXT_PUBLIC_NOVU_SOCKET_URL',
  'NEXT_PUBLIC_NOVU_SOCKET_TYPE',
] as const;

const SOCKET_ENV_KEYS = ['NEXT_PUBLIC_NOVU_SOCKET_URL', 'NEXT_PUBLIC_NOVU_SOCKET_TYPE'] as const;

const DEFAULT_US_API_URL = 'https://api.novu.co';

const API_HOST_SOCKET_URL: Record<string, string> = {
  'eu.api.novu.co': 'wss://eu.socket.novu.co',
  'api.novu-staging.co': 'wss://socket.novu-staging.co',
};

// Novu Box preview environments, e.g. https://my-box-api.box.novu-staging.co
const NOVU_BOX_API_HOST_PATTERN = /^(?<box>[a-z0-9-]+)-api\.box\.novu-staging\.co$/;

type ScaffoldSocketConfig = {
  socketUrl: string;
  socketType?: 'cloud';
};

function resolveScaffoldSocketConfig(apiUrl: string): ScaffoldSocketConfig | undefined {
  try {
    const hostname = new URL(apiUrl).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.novu.localhost')) {
      return { socketUrl: 'ws://127.0.0.1:8787' };
    }

    const knownSocketUrl = API_HOST_SOCKET_URL[hostname];
    if (knownSocketUrl) {
      return { socketUrl: knownSocketUrl };
    }

    const boxHost = hostname.match(NOVU_BOX_API_HOST_PATTERN)?.groups?.box;
    if (boxHost) {
      return { socketUrl: `wss://${boxHost}.box.novu-staging.co/ws`, socketType: 'cloud' };
    }

    return undefined;
  } catch {
    return undefined;
  }
}

// Compares hostnames (not the raw string) so http vs https, a trailing slash, or an explicit
// default port don't make buildWebChatEnvEntries and isKnownScaffoldApiHost disagree on
// whether an apiUrl is the US Cloud default.
function isDefaultUsApiHost(apiUrl: string): boolean {
  try {
    return new URL(apiUrl).hostname === new URL(DEFAULT_US_API_URL).hostname;
  } catch {
    return false;
  }
}

/**
 * False when the API host isn't one of the deployments we can infer a socket
 * address for (US Cloud default, EU, staging, localhost, or a Novu Box).
 * Self-hosted/unknown deployments can't be guessed — the caller should warn
 * that NEXT_PUBLIC_NOVU_SOCKET_URL needs to be set manually.
 */
export function isKnownScaffoldApiHost(apiUrl: string): boolean {
  return isDefaultUsApiHost(apiUrl) || resolveScaffoldSocketConfig(apiUrl) !== undefined;
}

/**
 * Whether connect should warn that it couldn't infer a socket URL for apiUrl: the host is
 * unrecognised AND the project doesn't already have a socket URL configured (e.g. the user set
 * one by hand after a previous warning — don't nag them again every run).
 */
export function resolveUnknownSocketHostWarning(apiUrl: string, projectDir: string): boolean {
  if (isKnownScaffoldApiHost(apiUrl)) {
    return false;
  }

  return !readProjectEnvValue(projectDir, 'NEXT_PUBLIC_NOVU_SOCKET_URL');
}

export function buildWebChatEnvEntries(input: WebChatEnvInput): Record<string, string> {
  const backendUrl = input.apiUrl.replace(/\/$/, '');
  const socketConfig = resolveScaffoldSocketConfig(input.apiUrl);
  const entries: Record<string, string> = {
    NEXT_PUBLIC_NOVU_APP_ID: input.applicationIdentifier,
    NEXT_PUBLIC_NOVU_SUBSCRIBER_ID: input.subscriberId,
    NEXT_PUBLIC_NOVU_AGENT_ID: input.agentIdentifier,
  };

  // US Cloud defaults to https://api.novu.co — omit so NovuProvider uses SDK defaults.
  if (!isDefaultUsApiHost(input.apiUrl)) {
    entries.NEXT_PUBLIC_NOVU_BACKEND_URL = backendUrl;
  }

  // Only non-default sockets (local, EU, staging, Novu Box). US Cloud defaults to wss://socket.novu.co.
  if (socketConfig) {
    entries.NEXT_PUBLIC_NOVU_SOCKET_URL = socketConfig.socketUrl;
    if (socketConfig.socketType) {
      entries.NEXT_PUBLIC_NOVU_SOCKET_TYPE = socketConfig.socketType;
    }
  }

  return entries;
}

function unquoteEnvValue(value: string): string {
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

function mergeEnvFileAtPath(envPath: string, entriesToSet: Record<string, string>): string[] {
  const created = !fs.existsSync(envPath);
  const existingContents = created ? '' : fs.readFileSync(envPath, 'utf8');
  const entries = parseEnvFile(existingContents);
  const updatedKeys: string[] = [];

  // A socket URL/type is only valid for the API host it was written for. If the backend URL
  // already in this file matches the one this run would write, the host hasn't changed: preserve
  // any socket settings this run didn't resupply (e.g. a value the user set by hand after a
  // previous unknownSocketHost warning). If the host changed — including to/from one we can't
  // infer a socket for — the old socket settings no longer apply, so clear them like any other
  // stale key.
  const hostUnchanged = entries.get('NEXT_PUBLIC_NOVU_BACKEND_URL') === entriesToSet.NEXT_PUBLIC_NOVU_BACKEND_URL;

  for (const key of WEB_CHAT_ENV_KEYS) {
    if (hostUnchanged && (SOCKET_ENV_KEYS as readonly string[]).includes(key)) {
      continue;
    }

    if (!(key in entriesToSet) && entries.delete(key)) {
      updatedKeys.push(key);
    }
  }

  for (const [key, value] of Object.entries(entriesToSet)) {
    const existing = entries.get(key);
    // Leave an already-correct quoted line alone; dotenv cuts unquoted values at `#`.
    if (existing !== undefined && unquoteEnvValue(existing) === value) {
      continue;
    }

    entries.set(key, value);
    updatedKeys.push(key);
  }

  if (updatedKeys.length === 0 && !created) {
    return updatedKeys;
  }

  fs.writeFileSync(envPath, serializeEnvWithComment(existingContents, entries, created));

  return updatedKeys;
}

function serializeEnvWithComment(existingContents: string, entries: Map<string, string>, created: boolean): string {
  if (created || !existingContents.trim()) {
    const lines = ['# Web Chat (added by npx novu connect)'];
    for (const key of WEB_CHAT_ENV_KEYS) {
      const value = entries.get(key);
      if (value) {
        lines.push(`${key}=${value}`);
      }
    }

    return `${lines.join('\n')}\n`;
  }

  const lines = existingContents.replace(/\s+$/, '').split(/\r?\n/);
  const preserved = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return true;
    }

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      return true;
    }

    const key = trimmed.slice(0, eq).trim();

    return !(WEB_CHAT_ENV_KEYS as readonly string[]).includes(key);
  });

  preserved.push('', '# Web Chat (added by npx novu connect)');
  for (const key of WEB_CHAT_ENV_KEYS) {
    const value = entries.get(key);
    if (value) {
      preserved.push(`${key}=${value}`);
    }
  }

  return `${preserved.join('\n')}\n`;
}

export function mergeWebChatEnv(input: WebChatEnvInput): WebChatEnvMergeResult {
  const envPaths = resolveProjectEnvPaths(input.projectDir);
  const entriesToSet = buildWebChatEnvEntries(input);
  const updatedKeys = new Set<string>();

  for (const envPath of envPaths) {
    for (const key of mergeEnvFileAtPath(envPath, entriesToSet)) {
      updatedKeys.add(key);
    }
  }

  return {
    envPaths,
    updatedKeys: [...updatedKeys],
  };
}

export function readWebChatSubscriberId(projectDir: string): string | undefined {
  for (const envPath of resolveProjectEnvPaths(projectDir)) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const rawSubscriberId = parseEnvFile(fs.readFileSync(envPath, 'utf8')).get('NEXT_PUBLIC_NOVU_SUBSCRIBER_ID');
    const subscriberId = rawSubscriberId === undefined ? undefined : unquoteEnvValue(rawSubscriberId);
    if (subscriberId) {
      return subscriberId;
    }
  }

  return undefined;
}

export function hasWebChatEnvConfigured(projectDir: string): boolean {
  for (const envPath of resolveProjectEnvPaths(projectDir)) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const entries = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
    const appId = entries.get('NEXT_PUBLIC_NOVU_APP_ID')?.trim();
    const agentId = entries.get('NEXT_PUBLIC_NOVU_AGENT_ID')?.trim();

    if (appId && agentId) {
      return true;
    }
  }

  return false;
}
