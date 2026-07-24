import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  detectSkillHosts,
  getSkillHostDir,
  installSkills,
  resolveSkillHosts,
  resolveWizardRuntimeSkillHosts,
  SAFE_DEFAULT_HOSTS,
  type SkillHost,
} from './install-skills';

let tempDir: string;

describe('installSkills', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-skills-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('always installs the bundled env-setup gap-filler at the flat skills root', () => {
    const { installed } = installSkills(tempDir, ['claude', 'cursor']);

    const gapFillers = installed.filter((skill) => skill.source === 'bundled' && skill.name !== 'legacy-novu-cleanup');
    expect(gapFillers.map((skill) => skill.name).sort()).toEqual(['env-setup', 'env-setup']);

    expect(fs.existsSync(path.join(tempDir, '.claude/skills/env-setup/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.cursor/skills/env-setup/SKILL.md'))).toBe(true);
  });

  it('installs into the requested hosts', () => {
    const { installed } = installSkills(tempDir, ['claude']);
    const hosts = Array.from(new Set(installed.map((skill) => skill.host)));

    expect(hosts).toEqual(['claude']);
    expect(fs.existsSync(path.join(tempDir, '.cursor/skills'))).toBe(false);
  });

  it('returns an empty result when no hosts are requested', () => {
    const result = installSkills(tempDir, []);
    expect(result.installed).toEqual([]);
    expect(result.officialFetched).toBe(false);
    expect(result.officialBranch).toMatch(/.+/);
  });

  it('honors a custom officialBranch option', () => {
    const result = installSkills(tempDir, {
      hosts: ['claude'],
      officialBranch: 'does-not-exist-xyz',
    });

    expect(result.officialBranch).toBe('does-not-exist-xyz');
    expect(result.officialFetched).toBe(false);
    expect(result.officialError).toBeDefined();
    expect(fs.existsSync(path.join(tempDir, '.claude/skills/env-setup/SKILL.md'))).toBe(true);
  });

  it('writes skills into every supported host destination', () => {
    const allHosts: SkillHost[] = [
      'claude',
      'cursor',
      'windsurf',
      'copilot',
      'gemini',
      'roo',
      'opencode',
      'kiro',
      'agents',
    ];
    installSkills(tempDir, allHosts);

    const expectedDirs: Record<SkillHost, string> = {
      claude: '.claude/skills',
      cursor: '.cursor/skills',
      windsurf: '.windsurf/skills',
      copilot: '.github/skills',
      gemini: '.gemini/skills',
      roo: '.roo/skills',
      opencode: '.opencode/skills',
      kiro: '.kiro/skills',
      agents: '.agents/skills',
    };

    for (const host of allHosts) {
      expect(fs.existsSync(path.join(tempDir, expectedDirs[host], 'env-setup/SKILL.md'))).toBe(true);
    }
  });

  it('removes the legacy .claude/skills/novu/ folder when it contains our skill installs', () => {
    const legacyRoot = path.join(tempDir, '.claude/skills/novu');
    fs.mkdirSync(path.join(legacyRoot, 'old-skill'), { recursive: true });
    fs.writeFileSync(path.join(legacyRoot, 'old-skill/SKILL.md'), '# old');

    const { installed } = installSkills(tempDir, ['claude']);

    expect(fs.existsSync(legacyRoot)).toBe(false);
    expect(installed.some((skill) => skill.name === 'legacy-novu-cleanup' && skill.host === 'claude')).toBe(true);
    expect(fs.existsSync(path.join(tempDir, '.claude/skills/env-setup/SKILL.md'))).toBe(true);
  });

  it('preserves a non-empty .claude/skills/novu/ that contains user content', () => {
    const legacyRoot = path.join(tempDir, '.claude/skills/novu');
    fs.mkdirSync(legacyRoot, { recursive: true });
    fs.writeFileSync(path.join(legacyRoot, 'notes.txt'), 'do not delete');

    const { installed } = installSkills(tempDir, ['claude']);

    expect(fs.existsSync(path.join(legacyRoot, 'notes.txt'))).toBe(true);
    expect(installed.some((skill) => skill.name === 'legacy-novu-cleanup')).toBe(false);
  });
});

describe('detectSkillHosts', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-detect-hosts-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports no hosts when no editor markers are present', () => {
    expect(detectSkillHosts(tempDir)).toEqual([]);
  });

  it('detects .claude and .cursor directories', () => {
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.cursor'), { recursive: true });

    const hosts = detectSkillHosts(tempDir);
    expect(hosts.sort()).toEqual(['claude', 'cursor']);
  });

  it('detects copilot via any of its known marker files', () => {
    fs.mkdirSync(path.join(tempDir, '.github'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.github/copilot-instructions.md'), '# rules');

    expect(detectSkillHosts(tempDir)).toContain('copilot');
  });

  it('detects the cross-agent host when .agents/ exists', () => {
    fs.mkdirSync(path.join(tempDir, '.agents'), { recursive: true });

    expect(detectSkillHosts(tempDir)).toContain('agents');
  });

  it('does not treat AGENTS.md alone as an editor marker', () => {
    fs.writeFileSync(path.join(tempDir, 'AGENTS.md'), '# project agents');

    expect(detectSkillHosts(tempDir)).toEqual([]);
  });

  it('detects every supported editor when all marker dirs exist', () => {
    const markers = ['.claude', '.cursor', '.windsurf', '.gemini', '.roo', '.opencode', '.kiro', '.agents'];
    for (const marker of markers) fs.mkdirSync(path.join(tempDir, marker), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.github'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.github/copilot-instructions.md'), '# rules');

    const hosts = detectSkillHosts(tempDir);
    expect(hosts.sort()).toEqual(
      ['agents', 'claude', 'copilot', 'cursor', 'gemini', 'kiro', 'opencode', 'roo', 'windsurf'].sort()
    );
  });
});

describe('resolveSkillHosts', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-resolve-hosts-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('falls back to the safe defaults when no editor is detected', () => {
    expect(resolveSkillHosts(tempDir)).toEqual(SAFE_DEFAULT_HOSTS);
  });

  it('safe defaults cover .claude, .cursor and the cross-agent path', () => {
    expect(SAFE_DEFAULT_HOSTS).toEqual(['claude', 'cursor', 'agents']);
  });

  it('returns the detected editors when present, ignoring the fallback', () => {
    fs.mkdirSync(path.join(tempDir, '.windsurf'), { recursive: true });

    expect(resolveSkillHosts(tempDir)).toEqual(['windsurf']);
  });

  it('returns multiple detected editors without adding the fallback set', () => {
    fs.mkdirSync(path.join(tempDir, '.cursor'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, '.windsurf'), { recursive: true });

    expect(resolveSkillHosts(tempDir).sort()).toEqual(['cursor', 'windsurf']);
  });
});

describe('getSkillHostDir', () => {
  it('returns the flat skills directory for known hosts', () => {
    expect(getSkillHostDir('claude')).toBe('.claude/skills');
    expect(getSkillHostDir('cursor')).toBe('.cursor/skills');
    expect(getSkillHostDir('agents')).toBe('.agents/skills');
    expect(getSkillHostDir('copilot')).toBe('.github/skills');
  });
});

describe('resolveWizardRuntimeSkillHosts', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-runtime-hosts-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('always includes claude even when a non-claude editor is detected', () => {
    fs.mkdirSync(path.join(tempDir, '.cursor'), { recursive: true });

    const hosts = resolveWizardRuntimeSkillHosts(tempDir);
    expect(hosts).toContain('claude');
    expect(hosts).toContain('cursor');
  });

  it('forces claude into the host list for repos with windsurf', () => {
    fs.mkdirSync(path.join(tempDir, '.windsurf'), { recursive: true });

    expect(resolveWizardRuntimeSkillHosts(tempDir).sort()).toEqual(['claude', 'windsurf']);
  });

  it('does not duplicate claude when it is already detected', () => {
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });

    const hosts = resolveWizardRuntimeSkillHosts(tempDir);
    expect(hosts.filter((host) => host === 'claude')).toHaveLength(1);
  });

  it('still falls back to the safe defaults when nothing is detected', () => {
    const hosts = resolveWizardRuntimeSkillHosts(tempDir);
    expect(hosts).toContain('claude');
    expect(hosts).toContain('cursor');
    expect(hosts).toContain('agents');
  });
});
