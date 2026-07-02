import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { applyDevNovuScript, buildDevNovuScript, hasDevNovuScript, shouldRefreshDevNovuScript } from './dev-script';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-chat-sdk-dev-script-'));
  tempDirs.push(dir);

  return dir;
}

describe('dev-script', () => {
  it('builds dev:novu from the existing dev script port', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'next dev --port=3001' } }));

    expect(buildDevNovuScript(dir)).toBe(
      'npx novu dev -p 3001 --no-studio --route /api/webhooks/novu --run "next dev --port=3001"'
    );
  });

  it('defaults plain next dev to port 4005 with PORT prefilled', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'next dev' } }));

    expect(buildDevNovuScript(dir)).toBe(
      'npx novu dev -p 4005 --no-studio --route /api/webhooks/novu --run "next dev --port=4005"'
    );
  });

  it('reads PORT from .env.local when dev script has no explicit port', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'next dev' } }));
    fs.writeFileSync(path.join(dir, '.env.local'), 'PORT=3005\n');

    expect(buildDevNovuScript(dir)).toBe(
      'npx novu dev -p 3005 --no-studio --route /api/webhooks/novu --run "next dev --port=3005"'
    );
  });

  it('applies dev:novu when missing', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { dev: 'next dev' } }));

    const result = applyDevNovuScript(dir);

    expect(result.applied).toBe(true);
    expect(hasDevNovuScript(dir)).toBe(true);
  });

  it('refreshes a stale generated dev:novu script that hardcoded port 4000', () => {
    const dir = makeTempDir();
    const stale = 'npx novu dev -p 4000 --no-studio --route /api/webhooks/novu --run "next dev --port=4000"';
    fs.writeFileSync(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { dev: 'next dev', 'dev:novu': stale } })
    );

    expect(shouldRefreshDevNovuScript(dir)).toBe(true);

    const result = applyDevNovuScript(dir);

    expect(result.applied).toBe(true);
    expect(result.script).toContain('npx novu dev -p 4005');
    expect(result.script).toContain('-p 4005');
  });

  it('does not overwrite a custom dev:novu script', () => {
    const dir = makeTempDir();
    const existing = 'node scripts/start-with-tunnel.mjs';
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { 'dev:novu': existing } }));

    const result = applyDevNovuScript(dir);

    expect(result.applied).toBe(false);
    expect(result.script).toBe(existing);
  });
});
