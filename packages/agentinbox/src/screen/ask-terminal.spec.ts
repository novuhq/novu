import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { askTerminal, aspectFromAnswer, themeFromAnswer, themeFromColorFgBg, themeFromEnv } from './ask-terminal';

/** Stdin as a terminal that answers what is asked with `answer`, after `delayMs`; or that never answers. */
function terminalAnswering(answer: string | null, delayMs = 5) {
  const input = Object.assign(new EventEmitter(), {
    isTTY: true,
    isRaw: false,
    setRawMode: vi.fn((mode: boolean) => {
      input.isRaw = mode;
    }),
    resume: vi.fn(),
    pause: vi.fn(),
  });
  const output = {
    isTTY: true,
    write: vi.fn(() => {
      if (answer !== null) {
        setTimeout(() => input.emit('data', Buffer.from(answer)), delayMs);
      }
    }),
  };

  return { input, output };
}

describe('the answers', () => {
  it('reads how tall a dot is for its width from the character size', () => {
    expect(aspectFromAnswer('\x1b[6;36;18t')).toBe(1);
    expect(aspectFromAnswer('\x1b[6;34;14t')).toBeCloseTo(1.214, 3);
    expect(aspectFromAnswer('\x1b[6;0;0t')).toBeUndefined();
    expect(aspectFromAnswer('nothing')).toBeUndefined();
  });

  it('reads the background from OSC 11, with 2 or 4 hex digits a channel, ended by BEL or ST', () => {
    expect(themeFromAnswer('\x1b]11;rgb:ffff/ffff/ffff\x07')).toBe('light');
    expect(themeFromAnswer('\x1b]11;rgb:1e1e/1e1e/1e1e\x1b\\')).toBe('dark');
    expect(themeFromAnswer('\x1b]11;rgb:fd/f6/e3\x07')).toBe('light');
    expect(themeFromAnswer('\x1b]11;rgb:28/2c/34\x1b\\')).toBe('dark');
    // Luminance, not the plain average: a saturated blue is dark, a yellow light.
    expect(themeFromAnswer('\x1b]11;rgb:0000/0000/ffff\x07')).toBe('dark');
    expect(themeFromAnswer('\x1b]11;rgb:ffff/ffff/0000\x07')).toBe('light');
    // Not finished yet: it waits for the rest.
    expect(themeFromAnswer('\x1b]11;rgb:ffff/ffff/ff')).toBeUndefined();
  });

  it('falls back on COLORFGBG, whose last field is the background', () => {
    expect(themeFromColorFgBg('0;15')).toBe('light');
    expect(themeFromColorFgBg('0;7')).toBe('light');
    expect(themeFromColorFgBg('15;0')).toBe('dark');
    expect(themeFromColorFgBg('7;default;8')).toBe('dark');
    expect(themeFromColorFgBg('15;12')).toBeUndefined();
    expect(themeFromColorFgBg(undefined)).toBeUndefined();
  });

  it('takes AGENTINBOX_THEME when it is dark or light', () => {
    expect(themeFromEnv({ AGENTINBOX_THEME: 'light' })).toBe('light');
    expect(themeFromEnv({ AGENTINBOX_THEME: 'DARK' })).toBe('dark');
    expect(themeFromEnv({ AGENTINBOX_THEME: 'blue' })).toBeUndefined();
  });
});

describe('askTerminal', () => {
  it('asks both things at once in raw mode, and puts raw mode back and pauses stdin once answered', async () => {
    const { input, output } = terminalAnswering('\x1b[6;42;18t\x1b]11;rgb:ffff/ffff/ffff\x1b\\');

    await expect(askTerminal(input, output, {})).resolves.toEqual({ aspect: 42 / 36, theme: 'light' });
    expect(output.write).toHaveBeenCalledWith('\x1b[16t\x1b]11;?\x07');
    expect(input.setRawMode.mock.calls).toEqual([[true], [false]]);
    expect(input.pause).toHaveBeenCalled();
    expect(input.listenerCount('data')).toBe(0);
  });

  it('reads answers that arrive in pieces', async () => {
    const { input, output } = terminalAnswering(null);
    output.write.mockImplementation(() => {
      for (const [index, piece] of ['\x1b[6;3', '6;18t\x1b]11;rgb:1e1e/', '1e1e/1e1e\x07'].entries()) {
        setTimeout(() => input.emit('data', piece), index + 1);
      }
    });

    await expect(askTerminal(input, output, {})).resolves.toEqual({ aspect: 1, theme: 'dark' });
  });

  it('gives up after 250ms: square dots, and the background from COLORFGBG or else dark', async () => {
    vi.useFakeTimers();
    try {
      const silent = terminalAnswering(null);
      const asked = askTerminal(silent.input, silent.output, { COLORFGBG: '0;15' });
      await vi.advanceTimersByTimeAsync(250);
      await expect(asked).resolves.toEqual({ aspect: 1, theme: 'light' });
      expect(silent.input.setRawMode.mock.calls).toEqual([[true], [false]]);

      const quiet = terminalAnswering(null);
      const plain = askTerminal(quiet.input, quiet.output, {});
      await vi.advanceTimersByTimeAsync(250);
      await expect(plain).resolves.toEqual({ aspect: 1, theme: 'dark' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('asks nothing without terminals, or when the environment says both', async () => {
    const piped = terminalAnswering('\x1b[6;36;18t');
    piped.input.isTTY = false;
    await expect(askTerminal(piped.input, piped.output, {})).resolves.toEqual({ aspect: 1, theme: 'dark' });
    expect(piped.output.write).not.toHaveBeenCalled();

    const told = terminalAnswering('\x1b[6;36;18t');
    const env = { AGENTINBOX_MASCOT_ASPECT: '1.2', AGENTINBOX_THEME: 'light' };
    await expect(askTerminal(told.input, told.output, env)).resolves.toEqual({ aspect: 1.2, theme: 'light' });
    expect(told.output.write).not.toHaveBeenCalled();
  });

  it('lets the environment win over the answer', async () => {
    const { input, output } = terminalAnswering('\x1b[6;36;18t\x1b]11;rgb:ffff/ffff/ffff\x07');

    await expect(askTerminal(input, output, { AGENTINBOX_THEME: 'dark' })).resolves.toEqual({
      aspect: 1,
      theme: 'dark',
    });
  });

  it('passes Ctrl-C typed meanwhile on as an interrupt, once the terminal is put back', async () => {
    const { input, output } = terminalAnswering('\x03');
    const interrupt = vi.fn(() => {
      expect(input.isRaw).toBe(false);
    });

    await askTerminal(input, output, {}, { interrupt });

    expect(interrupt).toHaveBeenCalledOnce();
  });
});
