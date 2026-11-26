import { describe, expect, it } from 'vitest';
import {
  COPILOT_HANDOFF_TTL_MS,
  clearCopilotHandoff,
  readCopilotHandoff,
  writeCopilotHandoff,
} from './copilot-handoff';

function memoryStorage() {
  const items = new Map<string, string>();

  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
  };
}

const throwingStorage = () => {
  throw new Error('SecurityError: storage is blocked');
};

describe('Copilot handoff', () => {
  it('hands the next Copilot the conversation and composer text while it is fresh', () => {
    const storage = memoryStorage();
    const getStorage = () => storage;

    writeCopilotHandoff({ conversationId: 'conv-1', prefill: 'Why did this run fail?' }, { now: 1000, getStorage });

    expect(readCopilotHandoff({ now: 1000 + COPILOT_HANDOFF_TTL_MS, getStorage })).toEqual({
      conversationId: 'conv-1',
      prefill: 'Why did this run fail?',
      createdAt: 1000,
    });
    expect(readCopilotHandoff({ now: 1001 + COPILOT_HANDOFF_TTL_MS, getStorage })).toBeUndefined();
  });

  it('keeps the page its own thread when no conversation is handed over', () => {
    const storage = memoryStorage();
    const getStorage = () => storage;

    writeCopilotHandoff({}, { now: 5, getStorage });

    expect(readCopilotHandoff({ now: 5, getStorage })).toEqual({ createdAt: 5 });
  });

  it('clears the handoff a Copilot took, but not a newer one', () => {
    const storage = memoryStorage();
    const getStorage = () => storage;

    writeCopilotHandoff({ conversationId: 'conv-1' }, { now: 1, getStorage });
    const taken = readCopilotHandoff({ now: 1, getStorage });
    writeCopilotHandoff({ conversationId: 'conv-2' }, { now: 2, getStorage });
    clearCopilotHandoff(taken!, { getStorage });

    expect(readCopilotHandoff({ now: 2, getStorage })?.conversationId).toBe('conv-2');

    clearCopilotHandoff(readCopilotHandoff({ now: 2, getStorage })!, { getStorage });
    expect(storage.items.size).toBe(0);
  });

  it('ignores a malformed entry and storage it cannot reach', () => {
    const storage = memoryStorage();
    storage.setItem('novu-copilot-handoff', '{"conversationId":42}');

    expect(readCopilotHandoff({ getStorage: () => storage })).toBeUndefined();
    expect(() => writeCopilotHandoff({ conversationId: 'conv-1' }, { getStorage: throwingStorage })).not.toThrow();
    expect(readCopilotHandoff({ getStorage: throwingStorage })).toBeUndefined();
    expect(() => clearCopilotHandoff({ createdAt: 1 }, { getStorage: throwingStorage })).not.toThrow();
  });
});
