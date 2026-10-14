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
});
