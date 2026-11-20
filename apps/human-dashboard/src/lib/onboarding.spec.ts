import { describe, expect, it } from 'vitest';

import { cardAddressOf } from './onboarding';

describe('cardAddressOf', () => {
  it('is the address being typed while there is no agent yet', () => {
    expect(cardAddressOf(null, 'atlas', 'agentinbox.md')).toBe('atlas@agentinbox.md');
  });

  it('is empty before anything is typed', () => {
    expect(cardAddressOf(null, '', 'agentinbox.md')).toBe('');
  });

  it('is the address the agent really has, whatever was typed', () => {
    expect(cardAddressOf({ address: 'atlas@agentinbox.md' }, 'something-else', 'agentinbox.md')).toBe(
      'atlas@agentinbox.md'
    );
  });

  // The card's code to scan is made from this: a typed address here would send mail to a mailbox nobody has.
  it('makes no address up for an agent whose inbox could not be read', () => {
    expect(cardAddressOf({ address: '' }, 'atlas', 'agentinbox.md')).toBe('');
  });
});
