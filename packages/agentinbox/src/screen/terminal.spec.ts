import { describe, expect, it } from 'vitest';
import { animationOff, foreground, nearestAnsi256, rowsOf, screenColors, stripEscapes, textWidth } from './terminal';

const tty = { isTTY: true };
const pipe = { isTTY: false };

describe('screenColors', () => {
  it('draws only for a person at a terminal: stdout and stderr both one', () => {
    expect(screenColors(tty, tty, {})).toBe('ansi256');
    expect(screenColors(pipe, tty, {})).toBeNull();
    expect(screenColors(tty, pipe, {})).toBeNull();
    expect(screenColors({}, {}, {})).toBeNull();
  });

  it('draws nothing where colour is off or nobody is watching', () => {
    for (const env of [
      { NO_COLOR: '1' },
      { NO_COLOR: 'true' },
      { TERM: 'dumb' },
      { FORCE_COLOR: '0' },
      { FORCE_COLOR: 'false' },
      { CI: 'true' },
      { CI: '1' },
    ]) {
      expect(screenColors(tty, tty, { COLORTERM: 'truecolor', ...env })).toBeNull();
    }
  });

  it('takes an empty NO_COLOR or CI=false as not set, the way the NO_COLOR convention reads them', () => {
    expect(screenColors(tty, tty, { NO_COLOR: '' })).toBe('ansi256');
    expect(screenColors(tty, tty, { CI: 'false' })).toBe('ansi256');
  });

  it('uses 24-bit colour where COLORTERM says the terminal has it, and 256 colours otherwise', () => {
    expect(screenColors(tty, tty, { COLORTERM: 'truecolor' })).toBe('truecolor');
    expect(screenColors(tty, tty, { COLORTERM: '24bit' })).toBe('truecolor');
    expect(screenColors(tty, tty, { TERM: 'xterm-256color' })).toBe('ansi256');
  });
});

describe('animationOff', () => {
  it('is on with AGENTINBOX_NO_ANIMATION set to anything but 0 or false', () => {
    expect(animationOff({})).toBe(false);
    expect(animationOff({ AGENTINBOX_NO_ANIMATION: '1' })).toBe(true);
    expect(animationOff({ AGENTINBOX_NO_ANIMATION: 'true' })).toBe(true);
    expect(animationOff({ AGENTINBOX_NO_ANIMATION: '0' })).toBe(false);
    expect(animationOff({ AGENTINBOX_NO_ANIMATION: 'false' })).toBe(false);
    expect(animationOff({ AGENTINBOX_NO_ANIMATION: '' })).toBe(false);
  });
});

describe('colours', () => {
  it('writes 24-bit colour as it is', () => {
    expect(foreground([0xff, 0x5c, 0x30], 'truecolor')).toBe('\x1b[38;2;255;92;48m');
  });

  it('takes the nearest of the 256 colours otherwise, from the colour cube and the greys', () => {
    expect(nearestAnsi256([255, 0, 0])).toBe(196);
    expect(nearestAnsi256([0, 0, 0])).toBe(16);
    expect(nearestAnsi256([255, 255, 255])).toBe(231);
    expect(nearestAnsi256([128, 128, 128])).toBe(244);
    // The brand orange and its highlight stay orange.
    expect(nearestAnsi256([0xff, 0x5c, 0x30])).toBe(203);
    expect(nearestAnsi256([0xff, 0x8a, 0x5e])).toBe(209);
    expect(foreground([0xff, 0x5c, 0x30], 'ansi256')).toBe('\x1b[38;5;203m');
  });
});

describe('textWidth', () => {
  it('counts what shows: no escapes, wide characters twice', () => {
    expect(textWidth('\x1b[1mbold\x1b[22m and \x1b[38;2;1;2;3mcolour\x1b[39m')).toBe(15);
    expect(textWidth('日本')).toBe(4);
    expect(textWidth('⣿⠁✔ →')).toBe(5);
    expect(stripEscapes('\x1b]8;;https://x\x07link\x1b]8;;\x07')).toBe('link');
  });

  it('counts the rows a line takes once the terminal wraps it', () => {
    expect(rowsOf('', 80)).toBe(1);
    expect(rowsOf('x'.repeat(80), 80)).toBe(1);
    expect(rowsOf('x'.repeat(81), 80)).toBe(2);
    expect(rowsOf(`\x1b[4m${'x'.repeat(200)}\x1b[24m`, 80)).toBe(3);
  });
});
