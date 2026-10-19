import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { mergeProjectEnv, readEnvSecretKey } from './wire-env';

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novu-wire-env-'));
  tempDirs.push(dir);

  return dir;
}

describe('mergeProjectEnv', () => {
  it('creates .env.local when no env files exist', () => {
    const dir = makeTempDir();

    const result = mergeProjectEnv({
      projectDir: dir,
      secretKey: 'nvsk_test_key',
      agentIdentifier: 'my-agent',
    });

    expect(result.envPaths).toEqual([path.join(dir, '.env.local')]);
    expect(fs.readFileSync(path.join(dir, '.env.local'), 'utf8')).toContain('NOVU_SECRET_KEY=nvsk_test_key');
    expect(fs.readFileSync(path.join(dir, '.env.local'), 'utf8')).toContain('NOVU_AGENT_IDENTIFIER=my-agent');
  });

  it('updates both .env.local and .env when both exist', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, '.env.local'), 'FOO=bar\n');
    fs.writeFileSync(path.join(dir, '.env'), 'BAR=baz\n');

    const result = mergeProjectEnv({
      projectDir: dir,
      secretKey: 'nvsk_test_key',
      agentIdentifier: 'my-agent',
    });

    expect(result.envPaths).toEqual([path.join(dir, '.env.local'), path.join(dir, '.env')]);
    expect(fs.readFileSync(path.join(dir, '.env.local'), 'utf8')).toContain('NOVU_AGENT_IDENTIFIER=my-agent');
    expect(fs.readFileSync(path.join(dir, '.env'), 'utf8')).toContain('NOVU_AGENT_IDENTIFIER=my-agent');
  });
});

describe('readEnvSecretKey', () => {
  it('reads from .env when .env.local has no secret', () => {
    const dir = makeTempDir();
    fs.writeFileSync(path.join(dir, '.env'), 'NOVU_SECRET_KEY=from-dot-env\n');

    expect(readEnvSecretKey(dir)).toBe('from-dot-env');
  });
});
