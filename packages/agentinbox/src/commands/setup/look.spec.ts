import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PickOptions } from '../../screen/screen';

const screenLook = vi.fn();

vi.mock('../../screen/screen', () => ({
  openedScreen: () => ({ look: screenLook }),
}));

const { chooseLook, completedLook, passedLook } = await import('./look');

/**
 * A terminal to pick on: what the person picks, in turn, and what they were asked and told. `<enter>` keeps the
 * one a question starts on, and so does running out of picks.
 */
function terminal(...picks: string[]) {
  const said: string[] = [];
  const pick = vi.fn(async (_question: string, options: PickOptions<string>) => {
    const picked = picks.shift();

    return picked === undefined || picked === '<enter>' ? (options.initial ?? options.choices[0]) : picked;
  });

  return {
    said,
    pick,
    io: {
      isTTY: true,
      write: (text: string) => {
        said.push(text);
      },
      prompt: vi.fn(),
      promptSecret: vi.fn(),
      openInBrowser: vi.fn(),
      pick: pick as never,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('passedLook', () => {
  it('is nothing when neither a shape nor a colour was passed', () => {
    expect(passedLook({})).toBeUndefined();
  });

  it('takes a shape, a colour or both, in any case', () => {
    expect(passedLook({ agentShape: 'drop', agentColor: 'coral' })).toEqual({ shape: 'drop', color: 'coral' });
    expect(passedLook({ agentShape: ' Drop ' })).toEqual({ shape: 'drop' });
    expect(passedLook({ agentColor: 'BONE' })).toEqual({ color: 'bone' });
  });

  it('stops for a shape or a colour there is none of, and says which there are', () => {
    expect(() => passedLook({ agentShape: 'cube' })).toThrow(
      '--agent-shape takes orb, pebble, drop, bean, peek or mochi.'
    );
    expect(() => passedLook({ agentColor: 'blue' })).toThrow(
      '--agent-color takes ember, marigold, coral, paprika, peach or bone.'
    );
    expect(() => passedLook({ agentShape: '' })).toThrow('--agent-shape takes');
  });
});

describe('completedLook', () => {
  it('fills what was left out with the original look’s, as the API does', () => {
    expect(completedLook({ shape: 'drop' })).toEqual({ shape: 'drop', color: 'ember' });
    expect(completedLook({ color: 'bone' })).toEqual({ shape: 'orb', color: 'bone' });
  });
});

describe('chooseLook', () => {
  it('asks for the shape and then the colour, each picked from the ones there are, starting on the original', async () => {
    const { io, pick, said } = terminal('drop', 'coral');

    await expect(chooseLook(io)).resolves.toEqual({ shape: 'drop', color: 'coral' });

    expect(said.join('')).toContain('Give your agent a look');
    expect(said.join('')).toContain("A look can't be changed later.");
    expect(pick.mock.calls.map(([question]) => question)).toEqual(['Shape: ', 'Color: ']);
    expect(pick.mock.calls[0][1]).toMatchObject({
      choices: ['orb', 'pebble', 'drop', 'bean', 'peek', 'mochi'],
      initial: 'orb',
    });
    expect(pick.mock.calls[1][1]).toMatchObject({
      choices: ['ember', 'marigold', 'coral', 'paprika', 'peach', 'bone'],
      initial: 'ember',
    });
  });

  it('names each one as the dashboard does', async () => {
    const { io, pick } = terminal();
    await chooseLook(io);

    expect(pick.mock.calls[0][1].label?.('pebble')).toBe('Pebble');
    expect(pick.mock.calls[1][1].label?.('marigold')).toBe('Marigold');
  });

  it('keeps the orange orb for whoever presses Enter twice, and sends no look for it', async () => {
    const { io } = terminal('<enter>', '<enter>');

    await expect(chooseLook(io)).resolves.toBeUndefined();
  });

  it('takes one pick alone: the other stays the original', async () => {
    await expect(chooseLook(terminal('<enter>', 'bone').io)).resolves.toEqual({ shape: 'orb', color: 'bone' });
    await expect(chooseLook(terminal('mochi', '<enter>').io)).resolves.toEqual({ shape: 'mochi', color: 'ember' });
  });

  it('shows each one on the mascot as the person moves to it, in the shape picked so far', async () => {
    const { io, pick } = terminal('drop', 'coral');
    await chooseLook(io);
    screenLook.mockClear();

    pick.mock.calls[0][1].onMove?.('bean');
    expect(screenLook).toHaveBeenLastCalledWith({ shape: 'bean', color: 'ember' });

    pick.mock.calls[1][1].onMove?.('bone');
    expect(screenLook).toHaveBeenLastCalledWith({ shape: 'drop', color: 'bone' });
  });

  it('leaves the mascot in the look that was picked', async () => {
    await chooseLook(terminal('drop', 'coral').io);

    expect(screenLook).toHaveBeenLastCalledWith({ shape: 'drop', color: 'coral' });
  });

  it('keeps each pick on the screen under its question', async () => {
    const { io, pick } = terminal('drop', 'coral');
    await chooseLook(io);

    expect(pick.mock.calls[0][1].remember?.('drop')).toMatchObject({ mark: 'done' });
    expect(pick.mock.calls[0][1].remember?.('drop')?.value).toContain('Shape:');
    expect(pick.mock.calls[0][1].remember?.('drop')?.value).toContain('Drop');
    expect(pick.mock.calls[1][1].remember?.('coral')?.value).toContain('Color:');
    expect(pick.mock.calls[1][1].remember?.('coral')?.value).toContain('Coral');
  });
});
