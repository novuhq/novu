import fs from 'node:fs';
import path from 'node:path';

const ENV_LINE_KEY = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/;

export function upsertEnvFile(filePath: string, values: Record<string, string>): void {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const lines = existing ? existing.replace(/\n$/, '').split('\n') : [];
  const pending = new Map(Object.entries(values));

  const updated = lines.map((line) => {
    const key = ENV_LINE_KEY.exec(line)?.[1];

    if (!key || !pending.has(key)) {
      return line;
    }

    const value = pending.get(key);
    pending.delete(key);

    return `${key}=${value}`;
  });

  for (const [key, value] of pending) {
    updated.push(`${key}=${value}`);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${updated.join('\n')}\n`);
}
