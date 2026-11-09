import { describe, expect, it } from 'vitest';
import {
  getPendingPromptAction,
  type PendingCopilotPrompt,
  readStoredPendingPrompt,
  writeStoredPendingPrompt,
} from './copilot-pending-prompt';

const prompt: PendingCopilotPrompt = { workflowId: 'wf-1', text: 'Build an onboarding workflow.' };

const ready = { prompt, workflowId: 'wf-1', draft: prompt.text, isReady: true, isThreadEmpty: true };

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

describe('getPendingPromptAction', () => {
  it('sends the untouched prompt into an empty thread once the Copilot is ready', () => {
    expect(getPendingPromptAction(ready)).toBe('send');
  });

  it('only prefills when the thread already has messages, so a reload after the send does not send it twice', () => {
    expect(getPendingPromptAction({ ...ready, isThreadEmpty: false })).toBe('keep');
  });

  it('waits while the Copilot is not ready', () => {
    expect(getPendingPromptAction({ ...ready, isReady: false })).toBe('wait');
    expect(getPendingPromptAction({ ...ready, isReady: false, isThreadEmpty: false })).toBe('wait');
  });

  it('leaves the composer to the user once they edited or sent the prompt, even before the Copilot is ready', () => {
    expect(getPendingPromptAction({ ...ready, draft: 'Build an onboarding workflow with SMS.' })).toBe('keep');
    expect(getPendingPromptAction({ ...ready, draft: '', isReady: false })).toBe('keep');
  });

  it('drops the prompt when the user left the workflow it was created for', () => {
    expect(getPendingPromptAction({ ...ready, workflowId: 'wf-2' })).toBe('drop');
    expect(getPendingPromptAction({ ...ready, workflowId: 'wf-2', isReady: false, draft: '' })).toBe('drop');
  });
});

describe('stored pending prompt', () => {
  it('reads back the saved prompt and forgets it once cleared', () => {
    const storage = memoryStorage();

    writeStoredPendingPrompt(prompt, () => storage);
    expect(readStoredPendingPrompt(() => storage)).toEqual(prompt);

    writeStoredPendingPrompt(undefined, () => storage);
    expect(readStoredPendingPrompt(() => storage)).toBeUndefined();
    expect(storage.items.size).toBe(0);
  });

  it.each(['not json', '"a string"', '42', 'null', '{"workflowId":"wf-1"}', '{"workflowId":1,"text":"Build"}'])(
    'ignores a malformed saved value %j',
    (raw) => {
      const storage = memoryStorage();
      storage.items.set('novu-copilot-pending-prompt', raw);

      expect(readStoredPendingPrompt(() => storage)).toBeUndefined();
    }
  );

  it('falls back quietly when storage throws', () => {
    expect(() => writeStoredPendingPrompt(prompt, throwingStorage)).not.toThrow();
    expect(() => writeStoredPendingPrompt(undefined, throwingStorage)).not.toThrow();
    expect(readStoredPendingPrompt(throwingStorage)).toBeUndefined();
  });
});
