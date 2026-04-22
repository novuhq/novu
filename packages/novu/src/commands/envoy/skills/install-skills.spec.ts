import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectSkillHosts, installSkills } from './install-skills';

let tempDir: string;

describe('installSkills', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-skills-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('always installs the bundled gap-filler skills under the novu/ directory', () => {
    const { installed } = installSkills(tempDir, ['claude', 'cursor']);

    const gapFillers = installed.filter((skill) => skill.source === 'bundled');
    expect(gapFillers.map((skill) => skill.name).sort()).toEqual([
      'dashboard-workflow',
      'dashboard-workflow',
      'env-setup',
      'env-setup',
      'framework-workflow',
      'framework-workflow',
    ]);

    expect(fs.existsSync(path.join(tempDir, '.claude/skills/novu/dashboard-workflow/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.claude/skills/novu/env-setup/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.claude/skills/novu/framework-workflow/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cursor/skills/novu/dashboard-workflow/SKILL.md'))).toBe(true);
  });

  it('installs into the requested hosts only', () => {
    const { installed } = installSkills(tempDir, ['claude']);
    const hosts = Array.from(new Set(installed.map((skill) => skill.host)));

    expect(hosts).toEqual(['claude']);
    expect(fs.existsSync(path.join(tempDir, '.cursor/skills/novu'))).toBe(false);
  });

  it('returns an empty result when no hosts are requested', () => {
    const result = installSkills(tempDir, []);
    expect(result.installed).toEqual([]);
    expect(result.officialFetched).toBe(false);
    expect(result.officialBranch).toBe('main');
  });

  it('honors a custom officialBranch option', () => {
    const result = installSkills(tempDir, { hosts: ['claude'], officialBranch: 'does-not-exist-xyz' });

    expect(result.officialBranch).toBe('does-not-exist-xyz');
    expect(result.officialFetched).toBe(false);
    expect(result.officialError).toBeDefined();
    expect(fs.existsSync(path.join(tempDir, '.claude/skills/novu/dashboard-workflow/SKILL.md'))).toBe(true);
  });
});

describe('detectSkillHosts', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'envoy-detect-hosts-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports no hosts when neither directory exists', () => {
    expect(detectSkillHosts(tempDir)).toEqual([]);
  });

  it('detects .claude and .cursor directories', () => {
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.cursor'), { recursive: true });

    const hosts = detectSkillHosts(tempDir);
    expect(hosts.sort()).toEqual(['claude', 'cursor']);
  });
});
