import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BirdSmsProvider } from './bird.provider';

vi.mock('axios');

describe('BirdSmsProvider', () => {
  const mockConfig = {
    apiKey: 'bk_us1_testkey123',
    from: '+15557654321',
  };

  beforeEach(() => {
    vi.mocked(axios.create).mockReturnValue({ post: axios.post } as never);
    vi.clearAllMocks();
  });

  it('sends free-text SMS with a transactional default category', async () => {
    const provider = new BirdSmsProvider(mockConfig);
    vi.mocked(axios.post).mockResolvedValue({
      data: { id: 'sms_123', created_at: '2026-10-14T00:00:00.000Z' },
    });

    const result = await provider.sendMessage({
      to: '+14155550100',
      content: 'Your code is 123456.',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://us1.platform.bird.com/v1/sms/messages',
      {
        to: '+14155550100',
        from: '+15557654321',
        text: 'Your code is 123456.',
        category: 'transactional',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer bk_us1_testkey123',
        },
      }
    );
    expect(result).toEqual({ id: 'sms_123', date: '2026-10-14T00:00:00.000Z' });
  });

  it('prefers message-level from and bridge category overrides', async () => {
    const provider = new BirdSmsProvider(mockConfig);
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'sms_456' } });

    await provider.sendMessage(
      { to: '+14155550100', content: 'Hi', from: '+10000000000' },
      { _passthrough: { body: { category: 'authentication' } } }
    );

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        from: '+10000000000',
        category: 'authentication',
      }),
      expect.any(Object)
    );
  });

  it('sends a workspace template with from and without text/category', async () => {
    const provider = new BirdSmsProvider(mockConfig);
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'sms_tpl' } });

    await provider.sendMessage(
      { to: '+14155550100', content: 'ignored' },
      {
        _passthrough: {
          body: { template: { slug: 'welcome', parameters: { name: 'Ada' } } },
        },
      }
    );

    const payload = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toEqual({
      to: '+14155550100',
      from: '+15557654321',
      template: { slug: 'welcome', parameters: { name: 'Ada' } },
    });
  });

  it('omits from for built-in templates that select their own sender', async () => {
    const provider = new BirdSmsProvider({ apiKey: 'bk_us1_testkey123' });
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'sms_builtin' } });

    await provider.sendMessage(
      { to: '+14155550100', content: 'ignored' },
      {
        _passthrough: {
          body: { template: { slug: 'bird_otp_verification', parameters: { code: '493021' } } },
        },
      }
    );

    const payload = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.template).toEqual({ slug: 'bird_otp_verification', parameters: { code: '493021' } });
    expect(payload.from).toBeUndefined();
    expect(payload.text).toBeUndefined();
    expect(payload.category).toBeUndefined();
  });

  it('omits from for built-in templates even when the worker passes the integration sender', async () => {
    const provider = new BirdSmsProvider({ apiKey: 'bk_us1_testkey123', from: '+15557654321' });
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'sms_builtin' } });

    await provider.sendMessage(
      { to: '+14155550100', content: 'ignored', from: '+15557654321' },
      {
        _passthrough: {
          body: { template: { slug: 'bird_otp_verification', parameters: { code: '493021' } } },
        },
      }
    );

    const payload = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.from).toBeUndefined();
  });

  it('uses an explicit baseUrl override', async () => {
    const provider = new BirdSmsProvider({
      apiKey: 'bk_us1_testkey123',
      from: '+15557654321',
      baseUrl: 'http://localhost:8080/',
    });
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'sms_local' } });

    await provider.sendMessage({ to: '+14155550100', content: 'Hi' });

    expect(vi.mocked(axios.post).mock.calls[0][0]).toBe('http://localhost:8080/v1/sms/messages');
  });

  it('preserves user-cased template parameters from direct bridge data', async () => {
    const provider = new BirdSmsProvider(mockConfig);
    vi.mocked(axios.post).mockResolvedValue({ data: { id: 'sms_tpl' } });

    await provider.sendMessage(
      { to: '+14155550100', content: 'ignored' },
      { template: { slug: 'welcome', parameters: { firstName: 'Ada' } } }
    );

    const payload = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
    expect(payload.template).toEqual({ slug: 'welcome', parameters: { firstName: 'Ada' } });
  });

  describe('webhook events', () => {
    const deliveredEvent = {
      type: 'sms.delivered',
      timestamp: '2026-06-10T14:30:00Z',
      data: { sms_id: 'sms_aaa', to: '+15551234567', from: '+12025550188' },
    };
    const failedEvent = {
      type: 'sms.failed',
      timestamp: '2026-06-10T14:31:00Z',
      data: {
        sms_id: 'sms_bbb',
        error: { code: 'unreachable', description: 'The handset is off' },
      },
    };

    it('extracts every SMS id from a batch', () => {
      const provider = new BirdSmsProvider(mockConfig);

      expect(provider.getMessageId([deliveredEvent, failedEvent] as never)).toEqual(['sms_aaa', 'sms_bbb']);
    });

    it('maps a delivered event', () => {
      const provider = new BirdSmsProvider(mockConfig);

      expect(provider.parseEventBody(deliveredEvent as never, 'sms_aaa')).toEqual({
        status: 'delivered',
        date: '2026-06-10T14:30:00Z',
        externalId: 'sms_aaa',
        row: JSON.stringify(deliveredEvent),
      });
    });

    it('maps a failed event with the error description as response', () => {
      const provider = new BirdSmsProvider(mockConfig);

      expect(provider.parseEventBody(failedEvent as never, 'sms_bbb')).toEqual({
        status: 'failed',
        date: '2026-06-10T14:31:00Z',
        externalId: 'sms_bbb',
        response: 'The handset is off',
        row: JSON.stringify(failedEvent),
      });
    });

    it.each([
      ['sms.accepted', 'accepted'],
      ['sms.sent', 'sent'],
      ['sms.undelivered', 'undelivered'],
      ['sms.rejected', 'rejected'],
      ['sms.expired', 'failed'],
    ])('maps %s to status "%s"', (type, expected) => {
      const provider = new BirdSmsProvider(mockConfig);
      const event = { type, timestamp: '2026-06-10T14:30:00Z', data: { sms_id: 'sms_x' } };

      expect(provider.parseEventBody(event as never, 'sms_x')?.status).toBe(expected);
    });

    it('returns undefined for an unknown identifier or event type', () => {
      const provider = new BirdSmsProvider(mockConfig);

      expect(provider.parseEventBody(deliveredEvent as never, 'sms_missing')).toBeUndefined();
      expect(
        provider.parseEventBody({ type: 'sms.received', timestamp: 'now', data: { sms_id: 'sms_x' } } as never, 'sms_x')
      ).toBeUndefined();
    });

    it('selects each repeated event by index', () => {
      const provider = new BirdSmsProvider(mockConfig);
      const sentEvent = {
        type: 'sms.sent',
        timestamp: '2026-06-10T14:29:00Z',
        data: { sms_id: 'sms_rrr' },
      };
      const laterDeliveredEvent = {
        type: 'sms.delivered',
        timestamp: '2026-06-10T14:30:00Z',
        data: { sms_id: 'sms_rrr' },
      };
      const batch = [sentEvent, laterDeliveredEvent] as never;

      expect(provider.getMessageId(batch)).toEqual(['sms_rrr', 'sms_rrr']);
      expect(provider.parseEventBody(batch, 'sms_rrr')?.status).toBe('sent');
      expect(provider.parseEventBody(batch, 'sms_rrr', 1)).toEqual({
        status: 'delivered',
        date: '2026-06-10T14:30:00Z',
        externalId: 'sms_rrr',
        row: JSON.stringify(laterDeliveredEvent),
      });
    });
  });
});
