import { afterEach, describe, expect, it, vi } from 'vitest';
import { fitToWidth, startWaitIndicator } from './spinner';

const MESSAGE = 'Waiting for you to verify your email';
const HINT = 'Ctrl-C detaches; resume with: npx @agentinbox/cli setup email';

describe('fitToWidth', () => {
  it('keeps the whole line where it fits, or where the width is unknown', () => {
    expect(fitToWidth(MESSAGE, '· 3s', HINT, 200)).toEqual({ message: MESSAGE, hint: HINT });
    expect(fitToWidth(MESSAGE, '· 3s', HINT, undefined)).toEqual({ message: MESSAGE, hint: HINT });
  });

  it('drops the hint first, then cuts the message short, so the line never wraps', () => {
    expect(fitToWidth(MESSAGE, '· 3s', HINT, 80)).toEqual({ message: MESSAGE });
    expect(fitToWidth(MESSAGE, '· 3s', HINT, 30)).toEqual({ message: 'Waiting for you to ve…' });
  });
});

describe('startWaitIndicator on a terminal', () => {
  const tty = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
  const columns = Object.getOwnPropertyDescriptor(process.stderr, 'columns');

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process.stderr, 'isTTY', tty ?? { value: undefined, configurable: true });
    Object.defineProperty(process.stderr, 'columns', columns ?? { value: undefined, configurable: true });
  });

  it('draws a line narrower than the terminal', () => {
    Object.defineProperty(process.stderr, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stderr, 'columns', { value: 80, configurable: true });
    const written: string[] = [];
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
      written.push(String(chunk));

      return true;
    });

    startWaitIndicator(MESSAGE, HINT)();

    const line = written[0].replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace('\r', '');
    expect(line.startsWith(`⠋ ${MESSAGE} · 0s`)).toBe(true);
    expect(line.length).toBeLessThan(80);
  });
});
