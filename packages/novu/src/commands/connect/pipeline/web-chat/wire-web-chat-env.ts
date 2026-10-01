import fs from 'node:fs';
import { parseEnvFile, resolveProjectEnvPaths } from '../bridge/wire-env';

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
] as const;

const DEFAULT_US_API_URL = 'https://api.novu.co';

const API_HOST_SOCKET_URL: Record<string, string> = {
  'eu.api.novu.co': 'wss://eu.socket.novu.co',
  'api.novu-staging.co': 'wss://socket.novu-staging.co',
};

export function resolveScaffoldSocketUrl(apiUrl: string): string | undefined {
  try {
    const hostname = new URL(apiUrl).hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.novu.localhost')) {
      return 'ws://127.0.0.1:8787';
    }

    return API_HOST_SOCKET_URL[hostname];
  } catch {
    return undefined;
  }
}

export function buildWebChatEnvEntries(input: WebChatEnvInput): Record<string, string> {
  const backendUrl = input.apiUrl.replace(/\/$/, '');
  const socketUrl = resolveScaffoldSocketUrl(input.apiUrl);
  const entries: Record<string, string> = {
    NEXT_PUBLIC_NOVU_APP_ID: input.applicationIdentifier,
    NEXT_PUBLIC_NOVU_SUBSCRIBER_ID: input.subscriberId,
    NEXT_PUBLIC_NOVU_AGENT_ID: input.agentIdentifier,
  };

  // US Cloud defaults to https://api.novu.co — omit so NovuProvider uses SDK defaults.
  if (backendUrl !== DEFAULT_US_API_URL) {
    entries.NEXT_PUBLIC_NOVU_BACKEND_URL = backendUrl;
  }

  // Only non-default sockets (local, EU, staging). US Cloud defaults to wss://socket.novu.co.
  if (socketUrl) {
    entries.NEXT_PUBLIC_NOVU_SOCKET_URL = socketUrl;
  }

  return entries;
}

function mergeEnvFileAtPath(envPath: string, entriesToSet: Record<string, string>): string[] {
  const created = !fs.existsSync(envPath);
  const existingContents = created ? '' : fs.readFileSync(envPath, 'utf8');
  const entries = parseEnvFile(existingContents);
  const updatedKeys: string[] = [];

  for (const [key, value] of Object.entries(entriesToSet)) {
    if (entries.get(key) === value) {
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
