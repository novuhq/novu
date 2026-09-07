import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { detectSkillHosts, installHumanSkill, resolveSkillHosts } from './install-skills';

const tempDirs: string[] = [];

function makeProjectDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'human-skill-'));
  tempDirs.push(dir);

  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('detectSkillHosts', () => {
  it('finds only editors whose marker exists', () => {
    const dir = makeProjectDir();
    mkdirSync(join(dir, '.claude'));
    mkdirSync(join(dir, '.cursor'));

    expect(detectSkillHosts(dir).sort()).toEqual(['claude', 'cursor']);
  });

  it('returns nothing when no markers exist', () => {
    expect(detectSkillHosts(makeProjectDir())).toEqual([]);
  });
});

describe('resolveSkillHosts', () => {
  it('falls back to the safe defaults (always including claude) when nothing is detected', () => {
    expect(resolveSkillHosts(makeProjectDir()).sort()).toEqual(['agents', 'claude', 'cursor']);
  });

  it('always includes claude even when only another editor is detected', () => {
    const dir = makeProjectDir();
    mkdirSync(join(dir, '.cursor'));

    expect(resolveSkillHosts(dir).sort()).toEqual(['claude', 'cursor']);
  });
});

describe('installHumanSkill', () => {
  it('copies bundled SKILL.md files into every requested host directory', () => {
    const dir = makeProjectDir();
    const installed = installHumanSkill(dir, ['claude', 'cursor']);

    expect(installed.map((entry) => `${entry.host}:${entry.skill}`).sort()).toEqual([
      'claude:human-cli',
      'claude:novu-human',
      'cursor:human-cli',
      'cursor:novu-human',
    ]);
    for (const entry of installed) {
      const content = readFileSync(join(dir, entry.destination, 'SKILL.md'), 'utf8');
      expect(content).toContain(`name: ${entry.skill}`);
    }
  });

  it('is idempotent — re-running overwrites cleanly without throwing', () => {
    const dir = makeProjectDir();
    installHumanSkill(dir, ['claude']);
    expect(() => installHumanSkill(dir, ['claude'])).not.toThrow();
  });
});
