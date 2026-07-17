import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const createInterface = vi.hoisted(() => vi.fn());

vi.mock('node:readline', () => ({
  default: {
    createInterface,
  },
}));

import { waitForConsoleLine } from './wait-for-console-line';

function createMockStdin(): EventEmitter & {
  isTTY: boolean;
  isPaused: () => boolean;
  setRawMode: (value: boolean) => void;
  setEncoding: (encoding: BufferEncoding) => void;
  resume: () => void;
  pause: () => void;
  ref: () => void;
  unref: () => void;
  destroyed: boolean;
  readableEnded: boolean;
} {
  const stdin = new EventEmitter() as EventEmitter & {
    isTTY: boolean;
    isPaused: () => boolean;
    setRawMode: (value: boolean) => void;
    setEncoding: (encoding: BufferEncoding) => void;
    resume: () => void;
    pause: () => void;
    ref: () => void;
    unref: () => void;
    destroyed: boolean;
    readableEnded: boolean;
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
  stdin.ref = vi.fn();
  stdin.unref = vi.fn();
  stdin.destroyed = false;
  stdin.readableEnded = false;

  return stdin;
}

function mockReadlineLine(line: string): void {
  createInterface.mockImplementationOnce(() => {
    const iface = new EventEmitter() as EventEmitter & { close: () => void };
    iface.close = vi.fn();
    queueMicrotask(() => iface.emit('line', line));

    return iface;
  });
}

describe('waitForConsoleLine', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('refs stdin for one line, then pauses and unrefs it', async () => {
    const stdin = createMockStdin();
    vi.stubGlobal('process', { ...process, stdin });
    mockReadlineLine('yes\n');

    await expect(waitForConsoleLine()).resolves.toBe('yes');
    expect(createInterface).toHaveBeenCalledWith(
      expect.objectContaining({
        input: stdin,
        output: process.stdout,
      })
    );
    expect(stdin.ref).toHaveBeenCalled();
    expect(stdin.resume).toHaveBeenCalled();
    expect(stdin.pause).toHaveBeenCalled();
    expect(stdin.unref).toHaveBeenCalled();
  });

  it('throws when stdin is not a TTY', async () => {
    const stdin = createMockStdin();
    stdin.isTTY = false;
    vi.stubGlobal('process', { ...process, stdin });

    await expect(waitForConsoleLine()).rejects.toThrow('no usable terminal is available');
  });
});
