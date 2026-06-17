import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_API_BASE_URL = 'https://api.novu.co';

export type EnvMergeInput = {
  projectDir: string;
  secretKey: string;
  agentIdentifier: string;
  apiBaseUrl?: string;
  overwriteSecretKey?: boolean;
};

export type EnvMergeResult = {
  envPath: string;
  created: boolean;
  updatedKeys: string[];
  secretKeyOverwritten: boolean;
};

function parseEnvFile(contents: string): Map<string, string> {
  const entries = new Map<string, string>();

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();

    entries.set(key, value);
  }

  return entries;
}

function serializeEnvFile(entries: Map<string, string>): string {
  const lines: string[] = [];

  for (const [key, value] of entries) {
    lines.push(`${key}=${value}`);
  }

  return `${lines.join('\n')}\n`;
}

export function maskSecretKey(secretKey: string): string {
  const trimmed = secretKey.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }

  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

export function mergeEnvLocal(input: EnvMergeInput): EnvMergeResult {
  const envPath = path.join(input.projectDir, '.env.local');
  const created = !fs.existsSync(envPath);
  const existingContents = created ? '' : fs.readFileSync(envPath, 'utf8');
  const entries = parseEnvFile(existingContents);
  const updatedKeys: string[] = [];
  let secretKeyOverwritten = false;

  const setKey = (key: string, value: string, force = false) => {
    const current = entries.get(key);
    if (current === value) {
      return;
    }

    if (key === 'NOVU_SECRET_KEY' && current && current !== value && !force) {
      return;
    }

    if (key === 'NOVU_SECRET_KEY' && current && current !== value && force) {
      secretKeyOverwritten = true;
    }

    entries.set(key, value);
    updatedKeys.push(key);
  };

  if (input.overwriteSecretKey || !entries.get('NOVU_SECRET_KEY')) {
    setKey('NOVU_SECRET_KEY', input.secretKey, input.overwriteSecretKey);
  }

  setKey('NOVU_AGENT_IDENTIFIER', input.agentIdentifier);

  const apiBaseUrl = input.apiBaseUrl?.trim();
  if (apiBaseUrl && apiBaseUrl !== DEFAULT_API_BASE_URL) {
    setKey('NOVU_API_BASE_URL', apiBaseUrl);
  }

  if (updatedKeys.length > 0 || created) {
    fs.writeFileSync(envPath, serializeEnvFile(entries));
  }

  return {
    envPath,
    created,
    updatedKeys,
    secretKeyOverwritten,
  };
}

export function readEnvSecretKey(projectDir: string): string | undefined {
  const envPath = path.join(projectDir, '.env.local');
  if (!fs.existsSync(envPath)) {
    return undefined;
  }

  const entries = parseEnvFile(fs.readFileSync(envPath, 'utf8'));

  return entries.get('NOVU_SECRET_KEY');
}
