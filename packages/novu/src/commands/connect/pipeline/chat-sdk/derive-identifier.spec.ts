import { describe, expect, it } from 'vitest';
import { defaultAgentNameFromDir, deriveAgentIdentifier } from './derive-identifier';

describe('deriveAgentIdentifier', () => {
  it('slugifies a human-readable name', () => {
    expect(deriveAgentIdentifier('My Support Bot')).toBe('my-support-bot');
  });

  it('falls back when the name is empty', () => {
    expect(deriveAgentIdentifier('   ')).toBe('my-chat-sdk-agent');
  });

  it('prefixes numeric-only names so the identifier starts with a letter', () => {
    expect(deriveAgentIdentifier('118')).toBe('agent-118');
  });

  it('prefixes names that start with a digit', () => {
    expect(deriveAgentIdentifier('3rd bot')).toBe('agent-3rd-bot');
  });
});

describe('defaultAgentNameFromDir', () => {
  it('title-cases a dashed directory name', () => {
    expect(defaultAgentNameFromDir('support-bot')).toBe('Support Bot');
  });
});
