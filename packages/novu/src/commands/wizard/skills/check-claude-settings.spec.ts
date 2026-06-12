import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectClaudeSettingsConflicts, formatClaudeSettingsConflictMessage } from './check-claude-settings';

let tempDir: string;

function writeSettings(relative: string, contents: unknown) {
  const target = path.join(tempDir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(contents), 'utf8');
}

describe('detectClaudeSettingsConflicts', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wizard-claude-settings-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns nothing when no settings file exists', () => {
    expect(detectClaudeSettingsConflicts(tempDir)).toEqual([]);
  });

  it('flags blocking env keys in settings.json', () => {
    writeSettings('.claude/settings.json', {
      env: {
        ANTHROPIC_BASE_URL: 'https://example.com',
        SOME_OTHER: 'ok',
      },
    });

    const conflicts = detectClaudeSettingsConflicts(tempDir);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].filePath).toBe(path.join('.claude', 'settings.json'));
    expect(conflicts[0].keys).toContain('env.ANTHROPIC_BASE_URL');
    expect(conflicts[0].keys).not.toContain('env.SOME_OTHER');
  });

  it('flags top-level apiKeyHelper', () => {
    writeSettings('.claude/settings.json', { apiKeyHelper: '/usr/local/bin/key-helper' });

    const conflicts = detectClaudeSettingsConflicts(tempDir);
    expect(conflicts[0].keys).toEqual(['apiKeyHelper']);
  });

  it('also scans settings.local.json', () => {
    writeSettings('.claude/settings.local.json', {
      env: { ANTHROPIC_AUTH_TOKEN: 'sk-foo' },
    });

    const conflicts = detectClaudeSettingsConflicts(tempDir);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].filePath).toBe(path.join('.claude', 'settings.local.json'));
    expect(conflicts[0].keys).toEqual(['env.ANTHROPIC_AUTH_TOKEN']);
  });

  it('ignores empty / null apiKeyHelper values', () => {
    writeSettings('.claude/settings.json', { apiKeyHelper: '' });

    expect(detectClaudeSettingsConflicts(tempDir)).toEqual([]);
  });

  it('ignores invalid JSON', () => {
    fs.mkdirSync(path.join(tempDir, '.claude'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, '.claude', 'settings.json'), '{not valid', 'utf8');

    expect(detectClaudeSettingsConflicts(tempDir)).toEqual([]);
  });
});

describe('formatClaudeSettingsConflictMessage', () => {
  it('returns an empty string when there are no conflicts', () => {
    expect(formatClaudeSettingsConflictMessage([])).toBe('');
  });

  it('mentions every conflicting file and key', () => {
    const message = formatClaudeSettingsConflictMessage([
      { filePath: '.claude/settings.json', keys: ['env.ANTHROPIC_BASE_URL', 'apiKeyHelper'] },
      { filePath: '.claude/settings.local.json', keys: ['env.ANTHROPIC_AUTH_TOKEN'] },
    ]);

    expect(message).toContain('.claude/settings.json');
    expect(message).toContain('env.ANTHROPIC_BASE_URL');
    expect(message).toContain('apiKeyHelper');
    expect(message).toContain('.claude/settings.local.json');
    expect(message).toContain('env.ANTHROPIC_AUTH_TOKEN');
  });
});
