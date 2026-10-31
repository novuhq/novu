import { afterEach, describe, expect, it, vi } from 'vitest';

// The command goes no further than opening its screen.
const openScreen = vi.hoisted(() => vi.fn(() => new Promise<never>(() => undefined)));

vi.mock('./screen/screen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./screen/screen')>()),
  openScreen,
}));

describe('a command as commander runs it', () => {
  const { argv } = process;

  afterEach(() => {
    process.argv = argv;
    openScreen.mockClear();
    vi.resetModules();
  });

  it.each([
    [['setup'], { command: 'setup' }],
    [['setup', 'telegram'], { command: 'setup telegram' }],
    [['login'], { command: 'login' }],
    [['connect', 'atlas', '--code', 'BCDF-GHJK'], { command: 'connect', handle: 'atlas' }],
  ])('%j names its screen as typed', async (args, screen) => {
    process.argv = ['node', 'agentinbox', ...args];

    await import('./index');

    expect(openScreen).toHaveBeenCalledWith(screen);
  });
});
