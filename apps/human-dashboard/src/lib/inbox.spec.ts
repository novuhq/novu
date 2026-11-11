import { describe, expect, it } from 'vitest';

import { channelName, isInboxChannel, menuChannels, parseInboxParams } from './inbox';

describe('WhatsApp in the inbox', () => {
  it('knows WhatsApp as a channel and names it properly', () => {
    expect(isInboxChannel('whatsapp')).toBe(true);
    expect(channelName('whatsapp')).toBe('WhatsApp');
  });

  it('keeps a WhatsApp filter from the address', () => {
    expect(parseInboxParams({ channel: 'whatsapp' }).view.channel).toBe('whatsapp');
  });

  it('lists WhatsApp in the filter menu only where the inbox has it, or is filtered to it', () => {
    expect(menuChannels({ all: 3, telegram: 3 })).toEqual(['email', 'telegram', 'slack']);
    expect(menuChannels({ all: 4, whatsapp: 1 })).toEqual(['email', 'telegram', 'slack', 'whatsapp']);
    expect(menuChannels({ all: 0 }, 'whatsapp')).toEqual(['email', 'telegram', 'slack', 'whatsapp']);
  });
});
