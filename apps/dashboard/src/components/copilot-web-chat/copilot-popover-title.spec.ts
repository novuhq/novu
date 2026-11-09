import type { AgentMessage } from '@novu/js';
import { describe, expect, it } from 'vitest';
import { getFirstPromptTitle, readStoredCopilotTitle, writeStoredCopilotTitle } from './copilot-popover-title';

function message(id: string, role: AgentMessage['role'], text: string): AgentMessage {
  return {
    id,
    role,
    parts: [{ type: 'text', text, state: 'done' }],
    createdAt: '2026-11-05T00:00:00.000Z',
    status: 'sent',
  };
}

function chatWith(messages: AgentMessage[], { hasMore = false, isLoading = false } = {}) {
  return { messages, isLoading, pagination: { status: 'idle' as const, hasMore, fetchMore: async () => ({}) } };
}

function memoryStorage() {
  const items = new Map<string, string>();

  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
  };
}

const throwingStorage = () => {
  throw new Error('SecurityError: storage is blocked');
};

describe('getFirstPromptTitle', () => {
  it('uses the first user message once the whole history is loaded', () => {
    const chat = chatWith([
      message('u1', 'user', 'Add an SMS step after the email step.'),
      message('a1', 'assistant', 'Done.'),
      message('u2', 'user', 'Change the subject.'),
    ]);

    expect(getFirstPromptTitle(chat)).toBe('Add an SMS step after the email step.');
  });

  it('is unknown while older pages are not loaded, since the first loaded message is not the first prompt', () => {
    const chat = chatWith([message('u2', 'user', 'Change the subject.')], { hasMore: true });

    expect(getFirstPromptTitle(chat)).toBeUndefined();
  });

  it('is unknown while the history loads', () => {
    expect(getFirstPromptTitle(chatWith([], { isLoading: true }))).toBeUndefined();
  });

  it('is unknown before the first prompt is sent or when it has no text', () => {
    expect(getFirstPromptTitle(chatWith([]))).toBeUndefined();
    expect(getFirstPromptTitle(chatWith([message('u1', 'user', '   ')]))).toBeUndefined();
  });
});

describe('stored Copilot title', () => {
  it('reads back the title saved for the same conversation only', () => {
    const storage = memoryStorage();
    writeStoredCopilotTitle('conv-1', 'Add an SMS step.', () => storage);

    expect(readStoredCopilotTitle('conv-1', () => storage)).toBe('Add an SMS step.');
    expect(readStoredCopilotTitle('conv-2', () => storage)).toBeUndefined();
    expect(readStoredCopilotTitle(undefined, () => storage)).toBeUndefined();
  });

  it('stores at most 200 characters of a long prompt', () => {
    const storage = memoryStorage();
    writeStoredCopilotTitle('conv-1', 'x'.repeat(500), () => storage);

    expect(readStoredCopilotTitle('conv-1', () => storage)).toHaveLength(200);
  });

  it('falls back quietly when storage throws', () => {
    expect(() => writeStoredCopilotTitle('conv-1', 'Add an SMS step.', throwingStorage)).not.toThrow();
    expect(readStoredCopilotTitle('conv-1', throwingStorage)).toBeUndefined();
  });
});
