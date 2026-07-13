import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyDevNovuScript, buildDevNovuScript, buildDevNovuSpawnArgs } from './dev-script';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-ai-sdk-dev-script-'));
  tempDirs.push(dir);

  return dir;
}

describe('ai-sdk dev-script', () => {
  it('builds dev:novu with the agent bridge route /api/novu', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'next dev --port=3001' } }));

    expect(buildDevNovuScript(dir)).toBe(
      'npx novu dev -p 3001 --no-studio --route /api/novu --run "next dev --port=3001"'
    );
  });

  it('does not overwrite a custom dev:novu script', () => {
    const dir = makeTempDir();
    const existing = 'node scripts/start-with-tunnel.mjs';
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { 'dev:novu': existing } }));

    const result = applyDevNovuScript(dir);

    expect(result.applied).toBe(false);
    expect(result.script).toBe(existing);
  });

  it('keeps a malicious dev script in a single --run argv element', () => {
    const dir = makeTempDir();
    const malicious = 'node server.js" && touch /tmp/pwned #';
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: malicious } }));

    const { command, args } = buildDevNovuSpawnArgs(dir);
    const runArgIndex = args.indexOf('--run');

    expect(command).toBe('npx');
    expect(runArgIndex).toBeGreaterThanOrEqual(0);
    expect(args[runArgIndex + 1]).toBe(malicious);
    expect(buildDevNovuScript(dir)).toContain(malicious);
  });
});
