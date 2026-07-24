import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function homePath(...segments: string[]): string {
  return path.join(os.homedir(), ...segments);
}

export function existsHome(...segments: string[]): boolean {
  try {
    return fs.existsSync(homePath(...segments));
  } catch {
    return false;
  }
}

export function existsCwd(...segments: string[]): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), ...segments));
  } catch {
    return false;
  }
}

export function readJson(filePath: string): Record<string, unknown> {
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    if (!raw.trim()) return {};
    const parsed = JSON.parse(raw);

    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function writeJson(filePath: string, payload: Record<string, unknown>): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

/**
 * Inserts/replaces the `novu` entry inside the `mcpServers` map of `payload`,
 * leaving any other MCP servers in place. Mutates and returns `payload`.
 */
export function upsertMcpServer(
  payload: Record<string, unknown>,
  serverKey: string,
  serverConfig: Record<string, unknown>,
  mapKey = 'mcpServers'
): Record<string, unknown> {
  const existing = (payload[mapKey] as Record<string, unknown> | undefined) ?? {};
  payload[mapKey] = { ...existing, [serverKey]: serverConfig };

  return payload;
}
