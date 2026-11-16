import { describe, expect, it } from 'vitest';

import { describeWhatsAppWindow } from './whatsapp-window';

const NOW = new Date('2026-11-11T10:00:00');

describe('describeWhatsAppWindow', () => {
  it('says until when WhatsApp can write to them today', () => {
    const closesAt = new Date('2026-11-11T14:32:00');

    const described = describeWhatsAppWindow({ open: true, closesAt: closesAt.toISOString() }, NOW, 'en-GB');

    expect(described).toEqual({
      open: true,
      label: 'open until 14:32',
      detail: 'WhatsApp can write to them until 14:32, 24 hours after their last message.',
    });
  });

  it('names the day when the window shuts tomorrow', () => {
    const closesAt = new Date('2026-11-12T09:15:00');

    expect(describeWhatsAppWindow({ open: true, closesAt: closesAt.toISOString() }, NOW, 'en-GB').label).toBe(
      'open until Thu 09:15'
    );
  });

  it('reads a shut window as closed, whatever else it says', () => {
    for (const window of [
      { open: false },
      { open: false, closesAt: '2026-11-10T10:00:00.000Z' },
      // Read open a while ago, and shut since.
      { open: true, closesAt: new Date('2026-11-11T09:00:00').toISOString() },
      { open: true },
    ]) {
      expect(describeWhatsAppWindow(window, NOW)).toMatchObject({ open: false, label: 'window closed' });
    }
  });
});
