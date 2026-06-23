import { describe, expect, it } from 'vitest';
import { defaultAgentNameFromDir, deriveAgentIdentifier } from './derive-identifier';

describe('deriveAgentIdentifier', () => {
  it('slugifies a human-readable name', () => {
    expect(deriveAgentIdentifier('My Support Bot')).toBe('my-support-bot');
  });

  it('falls back when the name is empty', () => {
    expect(deriveAgentIdentifier('   ')).toBe('my-chat-sdk-agent');
  });
});

describe('defaultAgentNameFromDir', () => {
  it('title-cases a dashed directory name', () => {
    expect(defaultAgentNameFromDir('support-bot')).toBe('Support Bot');
  });
});
