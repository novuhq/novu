import { describe, expect, it } from 'vitest';
import type { ShownCard } from '../api/card';
import { cardRows, printCard } from './card';

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
