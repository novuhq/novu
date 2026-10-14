import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BirdEmailProvider, resolveBirdBaseUrl } from './bird.provider';

vi.mock('axios');

describe('BirdEmailProvider', () => {
  const mockConfig = {
    apiKey: 'bk_eu1_testkey123',
    from: 'hello@acme.com',
    senderName: 'Acme',
  };

  beforeEach(() => {
    vi.mocked(axios.create).mockReturnValue({ post: axios.post } as never);
    vi.clearAllMocks();
  });

  describe('resolveBirdBaseUrl', () => {
    it('infers EU region from API key', () => {
      expect(resolveBirdBaseUrl('bk_eu1_abc')).toBe('https://eu1.platform.bird.com');
    });

    it('infers US region from API key', () => {
      expect(resolveBirdBaseUrl('bk_us1_abc')).toBe('https://us1.platform.bird.com');
    });

    it('prefers an explicit baseUrl', () => {
      expect(resolveBirdBaseUrl('bk_eu1_abc', 'http://localhost:8080/')).toBe('http://localhost:8080');
    });

    it('throws when region cannot be inferred', () => {
      expect(() => resolveBirdBaseUrl('invalid-key')).toThrow(/Could not infer Bird region/);
    });
  });

  describe('sendMessage', () => {
    it('sends an inline email with the Bird Email API shape', async () => {
      const provider = new BirdEmailProvider(mockConfig);
      vi.mocked(axios.post).mockResolvedValue({
        data: { id: 'em_123', created_at: '2026-10-14T00:00:00.000Z' },
      });

      const result = await provider.sendMessage({
        to: ['to@acme.com'],
        subject: 'Hello',
        html: '<p>Hi</p>',
        text: 'Hi',
      });

      expect(axios.post).toHaveBeenCalledWith(
        'https://eu1.platform.bird.com/v1/email/messages',
        {
          from: { email: 'hello@acme.com', name: 'Acme' },
          to: ['to@acme.com'],
          subject: 'Hello',
          html: '<p>Hi</p>',
          text: 'Hi',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer bk_eu1_testkey123',
          },
        }
      );
      expect(result).toEqual({ id: 'em_123', date: '2026-10-14T00:00:00.000Z' });
    });

    it('prefers message-level from, senderName, replyTo, cc, bcc, headers and attachments', async () => {
      const provider = new BirdEmailProvider(mockConfig);
      vi.mocked(axios.post).mockResolvedValue({ data: { id: 'em_456' } });

      await provider.sendMessage({
        from: 'custom@acme.com',
        senderName: 'Custom',
        to: ['to@acme.com'],
        subject: 'Hi',
        html: '<p>Hi</p>',
        cc: ['cc@acme.com'],
        bcc: ['bcc@acme.com'],
        replyTo: 'reply@acme.com',
        headers: { 'X-Custom': 'abc' },
        attachments: [{ mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt', cid: 'cid-1' }],
      });

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          from: { email: 'custom@acme.com', name: 'Custom' },
          cc: ['cc@acme.com'],
          bcc: ['bcc@acme.com'],
          reply_to: ['reply@acme.com'],
          headers: { 'X-Custom': 'abc' },
          attachments: [
            {
              filename: 'test.txt',
              content: Buffer.from('test').toString('base64'),
              content_type: 'text/plain',
              content_id: 'cid-1',
            },
          ],
        }),
        expect.any(Object)
      );
    });

    it('drops inline content when a stored template is supplied via passthrough', async () => {
      const provider = new BirdEmailProvider(mockConfig);
      vi.mocked(axios.post).mockResolvedValue({ data: { id: 'em_tpl' } });

      await provider.sendMessage(
        {
          to: ['to@acme.com'],
          subject: 'Ignored',
          html: '<p>Ignored</p>',
        },
        {
          _passthrough: {
            body: { template: { slug: 'welcome-email', parameters: { first_name: 'Jane' } } },
          },
        }
      );

      const payload = vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>;
      expect(payload.template).toEqual({ slug: 'welcome-email', parameters: { first_name: 'Jane' } });
      expect(payload.subject).toBeUndefined();
      expect(payload.html).toBeUndefined();
      expect(payload.text).toBeUndefined();
    });

    it('honors bridge overrides with the highest priority', async () => {
      const provider = new BirdEmailProvider(mockConfig);
      vi.mocked(axios.post).mockResolvedValue({ data: { id: 'em_789' } });

      await provider.sendMessage(
        { to: ['to@acme.com'], subject: 'Original', html: '<p>Hi</p>' },
        { _passthrough: { body: { subject: 'Overridden' } } }
      );

      expect((vi.mocked(axios.post).mock.calls[0][1] as Record<string, unknown>).subject).toBe('Overridden');
    });
  });

  describe('checkIntegration', () => {
    it('returns success when the send succeeds', async () => {
      const provider = new BirdEmailProvider(mockConfig);
      vi.mocked(axios.post).mockResolvedValue({ data: { id: 'em_1' } });

      await expect(
        provider.checkIntegration({ to: ['to@acme.com'], subject: 'Hi', html: '<p>Hi</p>' })
      ).resolves.toEqual({
        success: true,
        message: 'Integrated successfully!',
        code: 'success',
      });
    });

    it('returns failed when the send throws', async () => {
      const provider = new BirdEmailProvider(mockConfig);
      vi.mocked(axios.post).mockRejectedValue(new Error('bad key'));

      await expect(
        provider.checkIntegration({ to: ['to@acme.com'], subject: 'Hi', html: '<p>Hi</p>' })
      ).resolves.toEqual({
        success: false,
        message: 'bad key',
        code: 'failed',
      });
    });
  });

  describe('webhook events', () => {
    const deliveredEvent = {
      type: 'email.delivered',
      timestamp: '2026-07-23T14:51:47.107Z',
      data: { email_id: 'em_aaa', recipient_id: 'er_aaa', recipient: 'to@acme.com' },
    };
    const bouncedEvent = {
      type: 'email.bounced',
      timestamp: '2026-07-23T14:52:00.000Z',
      data: {
        email_id: 'em_bbb',
        bounce_code: 550,
        bounce_description: 'Invalid recipient',
      },
    };

    it('extracts every email id from a batch', () => {
      const provider = new BirdEmailProvider(mockConfig);

      expect(provider.getMessageId([deliveredEvent, bouncedEvent] as never)).toEqual(['em_aaa', 'em_bbb']);
    });

    it('maps a delivered event', () => {
      const provider = new BirdEmailProvider(mockConfig);

      expect(provider.parseEventBody(deliveredEvent as never, 'em_aaa')).toEqual({
        status: 'delivered',
        date: '2026-07-23T14:51:47.107Z',
        externalId: 'em_aaa',
        row: JSON.stringify(deliveredEvent),
      });
    });

    it('maps a bounced event with the description as response', () => {
      const provider = new BirdEmailProvider(mockConfig);

      expect(provider.parseEventBody(bouncedEvent as never, 'em_bbb')).toEqual({
        status: 'bounced',
        date: '2026-07-23T14:52:00.000Z',
        externalId: 'em_bbb',
        response: 'Invalid recipient',
        row: JSON.stringify(bouncedEvent),
      });
    });

    it('falls back to the bounce code when there is no description', () => {
      const provider = new BirdEmailProvider(mockConfig);
      const event = {
        type: 'email.bounced',
        timestamp: '2026-07-23T14:52:00.000Z',
        data: { email_id: 'em_ccc', bounce_code: 550 },
      };

      expect(provider.parseEventBody(event as never, 'em_ccc')?.response).toBe('550');
    });

    it('maps a rejection reason', () => {
      const provider = new BirdEmailProvider(mockConfig);
      const event = {
        type: 'email.rejected',
        timestamp: '2026-07-23T14:52:00.000Z',
        data: { email_id: 'em_ddd', rejection_reason: 'recipient_suppressed' },
      };

      const parsed = provider.parseEventBody(event as never, 'em_ddd');
      expect(parsed?.status).toBe('rejected');
      expect(parsed?.response).toBe('recipient_suppressed');
    });

    it.each([
      ['email.accepted', 'sent'],
      ['email.processed', 'sent'],
      ['email.deferred', 'delayed'],
      ['email.out_of_band_bounce', 'bounced'],
      ['email.complained', 'complaint'],
      ['email.opened', 'opened'],
      ['email.clicked', 'clicked'],
      ['email.unsubscribed', 'unsubscribed'],
      ['email.list_unsubscribed', 'unsubscribed'],
    ])('maps %s to status "%s"', (type, expected) => {
      const provider = new BirdEmailProvider(mockConfig);
      const event = { type, timestamp: '2026-07-23T14:52:00.000Z', data: { email_id: 'em_x' } };

      expect(provider.parseEventBody(event as never, 'em_x')?.status).toBe(expected);
    });

    it('returns undefined for an unknown identifier or event type', () => {
      const provider = new BirdEmailProvider(mockConfig);

      expect(provider.parseEventBody(deliveredEvent as never, 'em_missing')).toBeUndefined();
      expect(
        provider.parseEventBody(
          { type: 'email.scheduled', timestamp: 'now', data: { email_id: 'em_x' } } as never,
          'em_x'
        )
      ).toBeUndefined();
    });
  });
});
