import { describe, expect, it } from 'vitest';
import { stripEscapes, textWidth } from './terminal';
import { wrapStyled } from './wrap';

describe('wrapStyled', () => {
  it('breaks at spaces, and leaves no line wider than asked', () => {
    const lines = wrapStyled('Agents on this computer now reach you on your account’s channels.', 24);

    expect(lines).toEqual(['Agents on this computer', 'now reach you on your', 'account’s channels.']);
  });

  it('breaks inside a word only where the word alone is wider than a line', () => {
    expect(wrapStyled('Saved to /private/tmp/some/very/long/path.json', 16)).toEqual([
      'Saved to',
      '/private/tmp/som',
      'e/very/long/path',
      '.json',
    ]);
  });

  it('starts a new line at every new line in the text', () => {
    expect(wrapStyled('first line\nsecond', 40)).toEqual(['first line', 'second']);
  });

  it('closes styles at the end of a line and opens them again on the next', () => {
    const lines = wrapStyled('see \x1b[1mvery important words\x1b[22m here', 12);

    expect(lines.map(stripEscapes)).toEqual(['see very', 'important', 'words here']);
    expect(lines[0]).toBe('see \x1b[1mvery\x1b[0m');
    expect(lines[1]).toBe('\x1b[1mimportant\x1b[0m');
    expect(lines[2].startsWith('\x1b[1mwords\x1b[22m here')).toBe(true);
    for (const line of lines) {
      expect(textWidth(line)).toBeLessThanOrEqual(12);
    }
  });
});
