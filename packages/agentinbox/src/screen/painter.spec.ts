import { describe, expect, it } from 'vitest';
import { BEGIN_FRAME, END_FRAME, repaint } from './painter';
import { VirtualTerminal } from './virtual-terminal.fixture';

/** Draws `frames` one after the other in place, and gives what each wrote and what shows in the end. */
function drawn(frames: string[][], columns = 40, rows = 10) {
  const terminal = new VirtualTerminal(columns, rows);
  terminal.write('$ agentinbox login\n');
  let previous: string[] = [];
  const writes = frames.map((frame) => {
    const text = repaint(previous, frame, columns);
    terminal.write(text);
    previous = frame;

    return text;
  });

  return { writes, screen: terminal.screen().filter(Boolean) };
}

describe('repaint', () => {
  it('writes the first frame whole, at once', () => {
    const { writes, screen } = drawn([['one', 'two']]);

    expect(writes[0]).toBe(`${BEGIN_FRAME}\x1b[Jone\ntwo\n${END_FRAME}`);
    expect(screen).toEqual(['$ agentinbox login', 'one', 'two']);
  });

  it('rewrites only the lines that changed, and steps over the others', () => {
    const { writes, screen } = drawn([
      ['mascot', 'caption', 'status ⠋'],
      ['mascot', 'caption', 'status ⠙'],
    ]);

    expect(writes[1]).toBe(`${BEGIN_FRAME}\x1b[3F\x1b[1E\x1b[1E\x1b[2Kstatus ⠙\n${END_FRAME}`);
    expect(screen).toEqual(['$ agentinbox login', 'mascot', 'caption', 'status ⠙']);
  });

  it('writes nothing at all when nothing changed', () => {
    expect(repaint(['a', 'b'], ['a', 'b'], 40)).toBe('');
  });

  it('clears the lines left over when the frame gets shorter', () => {
    const { screen } = drawn([
      ['a', 'b', 'c', 'd'],
      ['a', 'B'],
    ]);

    expect(screen).toEqual(['$ agentinbox login', 'a', 'B']);
  });

  it('writes on from a line that takes another number of rows, since everything below it moves', () => {
    const link = `https://example.com/${'x'.repeat(50)}`;
    const { writes, screen } = drawn([
      ['a', 'short', 'z'],
      ['a', link, 'z'],
    ]);

    expect(writes[1]).toBe(`${BEGIN_FRAME}\x1b[3F\x1b[1E\x1b[J${link}\nz\n${END_FRAME}`);
    expect(screen).toEqual(['$ agentinbox login', 'a', link.slice(0, 40), link.slice(40), 'z']);
  });

  it('steps over a long line the terminal wraps by all its rows', () => {
    const link = `https://example.com/${'x'.repeat(50)}`;
    const { screen } = drawn([
      [link, 'status ⠋'],
      [link, 'status ⠙'],
    ]);

    expect(screen).toEqual(['$ agentinbox login', link.slice(0, 40), link.slice(40), 'status ⠙']);
  });
});
