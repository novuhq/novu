import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { askOffering, pickTyped, readAnswer, readPick } from './cli-io';

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

const RIGHT = '\x1b[C';
const LEFT = '\x1b[D';
const UP = '\x1b[A';
const DOWN = '\x1b[B';

describe('readPick', () => {
  /** A terminal to press keys on, and every place `readPick` reports. */
  function picking(initial = 0) {
    const { input, interrupt, type } = terminal();
    const moves: number[] = [];
    const pick = readPick({ count: 3, initial, onMove: (index) => moves.push(index) }, { input, interrupt });

    return { pick, moves, interrupt, type };
  }

  it('moves with the arrow keys and gives the place the person is on at Enter', async () => {
    const { pick, moves, type } = picking();

    await type(RIGHT);
    await type(DOWN);
    await type(LEFT);
    await type('\r');

    await expect(pick).resolves.toBe(1);
    expect(moves).toEqual([1, 2, 1]);
  });

  it('keeps the one it starts on for whoever only presses Enter', async () => {
    const { pick, moves, type } = picking(2);

    await type('\r');

    await expect(pick).resolves.toBe(2);
    expect(moves).toEqual([]);
  });

  it('goes round: back from the first is the last, and on from the last is the first', async () => {
    const { pick, moves, type } = picking();

    await type(UP);
    await type(RIGHT);
    await type('\r');

    await expect(pick).resolves.toBe(0);
    expect(moves).toEqual([2, 0]);
  });

  it('takes nothing that is typed for a pick', async () => {
    const { pick, moves, type } = picking(1);

    await type('3 drop');
    await type('\r');

    await expect(pick).resolves.toBe(1);
    expect(moves).toEqual([]);
  });

  it.each([
    ['Ctrl-C', '\x03'],
    ['Ctrl-D', '\x04'],
  ])('ends the command on %s, instead of leaving it without a pick', async (_, key) => {
    const { interrupt, type } = picking();

    await type(key);

    expect(interrupt).toHaveBeenCalledOnce();
  });

  it('ends the command on Ctrl-D after something was typed too, which nobody can see', async () => {
    const { interrupt, type } = picking();

    await type('drop');
    await type('\x04');

    expect(interrupt).toHaveBeenCalledOnce();
  });

  it('never writes anything: the screen draws the pick', async () => {
    const write = vi.spyOn(process.stdout, 'write');
    const { pick, type } = picking();

    await type(`${RIGHT}\r`);
    await pick;

    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });
});

describe('pickTyped', () => {
  const shapes = ['orb', 'pebble', 'drop'] as const;

  /** A plain terminal: the answers, in turn, and what it was asked and told. */
  function plain(...answers: string[]) {
    const ask = vi.fn(async (_question: string) => answers.shift() ?? '');
    const say = vi.fn();

    return { ask, say, on: { ask, say } };
  }

  it('names what there is to pick from, with the one on offer in brackets, and Enter keeps that one', async () => {
    const { ask, on } = plain('');

    await expect(pickTyped('Shape: ', { choices: shapes, initial: 'pebble' }, on)).resolves.toBe('pebble');
    expect(ask).toHaveBeenCalledWith('Shape (orb, pebble or drop) [pebble]: ');
  });

  it('offers the first where none is given', async () => {
    const { ask, on } = plain('');

    await expect(pickTyped('Shape: ', { choices: shapes }, on)).resolves.toBe('orb');
    expect(ask).toHaveBeenCalledWith('Shape (orb, pebble or drop) [orb]: ');
  });

  it('takes a name in any case, or its place among them', async () => {
    await expect(pickTyped('Shape: ', { choices: shapes }, plain(' Drop ').on)).resolves.toBe('drop');
    await expect(pickTyped('Shape: ', { choices: shapes }, plain('2').on)).resolves.toBe('pebble');
  });

  it('asks again for an answer that is none of them, saying which there are', async () => {
    const { ask, say, on } = plain('cube', '4', 'drop');

    await expect(pickTyped('Shape: ', { choices: shapes }, on)).resolves.toBe('drop');
    expect(ask).toHaveBeenCalledTimes(3);
    expect(say).toHaveBeenCalledTimes(2);
    expect(say.mock.calls[0][0]).toContain('Pick orb, pebble or drop.');
  });

  it('keeps the one on offer after a few wrong answers, rather than stop the command', async () => {
    const { ask, on } = plain('cube', 'cube', 'cube', 'cube', 'cube', 'drop');

    await expect(pickTyped('Shape: ', { choices: shapes, initial: 'pebble' }, on)).resolves.toBe('pebble');
    expect(ask).toHaveBeenCalledTimes(5);
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
