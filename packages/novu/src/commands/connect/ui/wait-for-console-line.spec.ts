import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitForConsoleLine } from './wait-for-console-line';

function createMockStdin(): EventEmitter & {
  isTTY: boolean;
  isPaused: () => boolean;
  setRawMode: (value: boolean) => void;
  setEncoding: (encoding: BufferEncoding) => void;
  resume: () => void;
  pause: () => void;
} {
  const stdin = new EventEmitter() as EventEmitter & {
    isTTY: boolean;
    isPaused: () => boolean;
    setRawMode: (value: boolean) => void;
    setEncoding: (encoding: BufferEncoding) => void;
    resume: () => void;
    pause: () => void;
  };

  let paused = true;

  stdin.isTTY = true;
  stdin.isPaused = () => paused;
  stdin.setRawMode = vi.fn();
  stdin.setEncoding = vi.fn();
  stdin.resume = vi.fn(() => {
    paused = false;
  });
  stdin.pause = vi.fn(() => {
    paused = true;
  });

  return stdin;
}

describe('waitForConsoleLine', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('resolves with trimmed line after stdin data', async () => {
    vi.useFakeTimers();
    const stdin = createMockStdin();
    vi.stubGlobal('process', { ...process, stdin });

    const pending = waitForConsoleLine();
    await vi.advanceTimersByTimeAsync(75);
    stdin.emit('data', 'yes\n');

    await expect(pending).resolves.toBe('yes');
    expect(stdin.pause).toHaveBeenCalled();
  });

  it('returns empty string when stdin is not a TTY', async () => {
    const stdin = createMockStdin();
    stdin.isTTY = false;
    vi.stubGlobal('process', { ...process, stdin });

    await expect(waitForConsoleLine()).resolves.toBe('');
  });
});
