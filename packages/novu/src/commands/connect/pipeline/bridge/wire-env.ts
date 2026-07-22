import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_API_BASE_URL = 'https://api.novu.co';

export const ENV_FILE_NAMES = ['.env.local', '.env'] as const;

export function parseEnvFile(contents: string): Map<string, string> {
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

export function maskSecretKey(secretKey: string): string {
  const trimmed = secretKey.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }

  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`;
}

export function resolveProjectEnvPaths(projectDir: string): string[] {
  const resolvedDir = path.resolve(projectDir);
  const existing = ENV_FILE_NAMES.map((name) => path.join(resolvedDir, name)).filter((envPath) =>
    fs.existsSync(envPath)
  );

  if (existing.length > 0) {
    return existing;
  }

  return [path.join(resolvedDir, '.env.local')];
}

export function readProjectEnvValue(projectDir: string, key: string): string | undefined {
  for (const name of ENV_FILE_NAMES) {
    const envPath = path.join(projectDir, name);
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const entries = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
    const value = entries.get(key);
    if (value) {
      return value;
    }
  }

  return undefined;
}

export function readEnvSecretKey(projectDir: string): string | undefined {
  return readProjectEnvValue(projectDir, 'NOVU_SECRET_KEY');
}
