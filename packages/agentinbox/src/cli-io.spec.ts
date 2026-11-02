import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { askOffering, readAnswer } from './cli-io';

/** A terminal to type on, and everything `readAnswer` reports. */
function terminal() {
  const input = new PassThrough();
  const changes: Array<[string, number]> = [];

  return {
    input,
    changes,
    interrupt: vi.fn(),
    onChange: (answer: string, cursor: number) => changes.push([answer, cursor]),
    type: async (text: string) => {
      input.write(text);
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

describe('readAnswer', () => {
  it('reports every key and gives the answer on Enter', async () => {
    const { input, interrupt, onChange, changes, type } = terminal();
    const answer = readAnswer({ onChange }, { input, interrupt });

    await type('Ad');
    await type('a');
    await type('\r');

    await expect(answer).resolves.toBe('Ada');
    expect(changes.at(-1)).toEqual(['Ada', 3]);
    expect(interrupt).not.toHaveBeenCalled();
  });

  it('starts from what it is given, for the person to keep', async () => {
    const { input, interrupt, onChange, type } = terminal();
    const answer = readAnswer({ initial: 'atlas', onChange }, { input, interrupt });

    await type('\r');

    await expect(answer).resolves.toBe('atlas');
  });

  it('keeps line editing working: backspace, moving back, and clearing the line', async () => {
    const { input, interrupt, onChange, changes, type } = terminal();
    const answer = readAnswer({ initial: 'atlas', onChange }, { input, interrupt });

    await type('\x7f');
    expect(changes.at(-1)).toEqual(['atla', 4]);
    await type('\x1b[D');
    expect(changes.at(-1)).toEqual(['atla', 3]);
    await type('\x15');
    expect(changes.at(-1)).toEqual(['a', 0]);
    await type('\r');

    await expect(answer).resolves.toBe('a');
  });

  it.each([
    ['Ctrl-C', '\x03'],
    ['Ctrl-D on an empty line', '\x04'],
  ])('ends the command on %s, instead of leaving it without an answer', async (_, key) => {
    const { input, interrupt, onChange, type } = terminal();
    void readAnswer({ onChange }, { input, interrupt });

    await type(key);

    expect(interrupt).toHaveBeenCalledOnce();
  });

  it('never writes what was typed anywhere', async () => {
    const write = vi.spyOn(process.stdout, 'write');
    const { input, interrupt, onChange, type } = terminal();
    const answer = readAnswer({ onChange }, { input, interrupt });

    await type('secret\r');
    await answer;

    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
});

describe('askOffering', () => {
  it('shows what is on offer in brackets, and Enter takes it', async () => {
    const ask = vi.fn(async () => '');

    await expect(
      askOffering("Your agent's address: ", { initial: 'atlas', suffix: '@agentinbox.md' }, ask)
    ).resolves.toBe('atlas');
    expect(ask).toHaveBeenCalledWith("Your agent's address [atlas@agentinbox.md]: ");
  });

  it('takes what is typed instead', async () => {
    await expect(askOffering('Address: ', { initial: 'atlas' }, async () => 'orion')).resolves.toBe('orion');
  });

  it('asks as it is when nothing is on offer', async () => {
    const ask = vi.fn(async () => 'Ada');

    await expect(askOffering('Your first name: ', {}, ask)).resolves.toBe('Ada');
    expect(ask).toHaveBeenCalledWith('Your first name: ');
  });
});
