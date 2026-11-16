import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShownCard } from '../api/card';
import type { CliConfig } from '../config';

const showCard = vi.fn();
const loadConfig = vi.fn();
const saveConfig = vi.fn();
const openScreen = vi.fn();

vi.mock('../api/card', () => ({ showCard: (...args: unknown[]) => showCard(...args) }));

vi.mock('../config', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../config')>()),
  loadConfig: () => loadConfig(),
  saveConfig: (...args: unknown[]) => saveConfig(...args),
}));

vi.mock('../screen/screen', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../screen/screen')>()),
  openScreen: (...args: unknown[]) => openScreen(...args),
}));

vi.mock('./interact', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./interact')>()),
  // The command acts with what is saved on this computer.
  clientFromConfig: () => ({ client: {}, config: loadConfig() }),
  handleError: (err: unknown) => {
    throw err;
  },
}));

const { cardCommand, cardRows, printCard } = await import('./card');

const CARD: ShownCard = {
  greeting: 'Hi Ada, I’m Sid. I have my own inbox now. Here’s my card, so people can email or message me directly.',
  name: 'Sid',
  handle: 'sid',
  address: 'sid@agentinbox.md',
  url: 'https://agentinbox.md/p/sid',
  look: { shape: 'bean', color: 'marigold', art: { kind: 'rays', seed: 0 } },
  operatorFirstName: 'Ada',
  firstShown: true,
};

// biome-ignore lint/suspicious/noControlCharactersInRegex: strips the colours picocolors adds.
const plain = (text: string) => text.replace(/\u001b\[[0-9;]*m/g, '');

function printed(card: ShownCard, isTTY: boolean): string {
  let text = '';
  printCard(card, { write: (chunk) => (text += chunk), isTTY });

  return plain(text);
}

describe('agentinbox card, with the agent’s look', () => {
  const saved: CliConfig = {
    apiUrl: 'https://www.agentinbox.md/api',
    auth: { mode: 'apiKey', secretKey: 'sk_account' },
    relayAgentIdentifier: 'human-relay',
    subscriberId: 'ada',
  };

  /** Thrown where the command exits, so it stops there as it would for real. */
  class ExitCalled extends Error {}

  beforeEach(() => {
    vi.clearAllMocks();
    loadConfig.mockReturnValue(saved);
    showCard.mockResolvedValue(CARD);
    openScreen.mockResolvedValue(null);
    vi.spyOn(process.stdout, 'write').mockReturnValue(true);
    vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new ExitCalled();
    }) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens its screen in the look the card carries, and keeps it for the next command’s screen', async () => {
    await expect(cardCommand({})).rejects.toBeInstanceOf(ExitCalled);

    expect(openScreen).toHaveBeenCalledWith({
      command: 'card',
      handle: 'sid',
      look: { shape: 'bean', color: 'marigold' },
    });
    // Only what the terminal draws is kept, next to everything else saved here.
    expect(saveConfig).toHaveBeenCalledWith({ ...saved, look: { shape: 'bean', color: 'marigold' } });
  });

  it('keeps the look when the card is asked for as JSON too, and writes nothing once it is saved', async () => {
    await expect(cardCommand({ json: true })).rejects.toBeInstanceOf(ExitCalled);
    expect(saveConfig).toHaveBeenCalledTimes(1);

    loadConfig.mockReturnValue({ ...saved, look: { shape: 'bean', color: 'marigold' } });
    await expect(cardCommand({ json: true })).rejects.toBeInstanceOf(ExitCalled);
    expect(saveConfig).toHaveBeenCalledTimes(1);
  });

  it('draws the orb in ember for a look this CLI doesn’t know yet, and saves nothing', async () => {
    showCard.mockResolvedValue({ ...CARD, look: { shape: 'cube', color: 'marigold', art: { kind: 'rays', seed: 0 } } });

    await expect(cardCommand({})).rejects.toBeInstanceOf(ExitCalled);

    expect(openScreen).toHaveBeenCalledWith({ command: 'card', handle: 'sid', look: undefined });
    expect(saveConfig).not.toHaveBeenCalled();
  });
});

describe('agentinbox card', () => {
  it('lists the name, the address and the link, kept whole to be clicked', () => {
    const rows = cardRows(CARD);

    expect(rows.map((row) => [row.label, plain(row.value)])).toEqual([
      ['Name', 'Sid'],
      ['Email', 'sid@agentinbox.md'],
      ['Card', 'https://agentinbox.md/p/sid'],
    ]);
    expect(rows[2].whole).toBe(true);
  });

  it('leaves out the link while the card isn’t public', () => {
    expect(cardRows({ ...CARD, url: undefined }).map((row) => row.label)).toEqual(['Name', 'Email']);
  });

  it('prints the agent saying hi, then its card', () => {
    expect(printed(CARD, false)).toBe(
      `${CARD.greeting}\n\n  Sid\n  sid@agentinbox.md\n  https://agentinbox.md/p/sid\n`
    );
  });

  it('adds a QR code of the link for a person at a terminal, and only for them', () => {
    expect(printed(CARD, true)).toContain('█');
    expect(printed(CARD, false)).not.toContain('█');
    expect(printed({ ...CARD, url: undefined }, true)).not.toContain('█');
  });

  it('keeps terminal escape sequences in the card from reaching the terminal', () => {
    const hostile: ShownCard = {
      ...CARD,
      greeting: '\u001b]0;Injected title\u0007Hi',
      name: '\u001b[2JSid',
      address: 'sid@agentinbox.md\u001b[1A',
      url: 'https://agentinbox.md/p/sid\u009b2J\u001b]52;c;aGk=\u0007',
    };
    let text = '';
    printCard(hostile, { write: (chunk) => (text += chunk), isTTY: false });

    expect(plain(text)).toBe('Hi\n\n  Sid\n  sid@agentinbox.md\n  https://agentinbox.md/p/sid2J\n');
    expect(cardRows(hostile).map((row) => plain(row.value))).toEqual([
      'Sid',
      'sid@agentinbox.md',
      'https://agentinbox.md/p/sid2J',
    ]);
  });
});
