import { afterEach, expect, test, vi } from 'vitest';
import { TextLkSmsProvider } from './textlk.provider';

afterEach(() => {
  vi.restoreAllMocks();
});

test('should trigger Text.lk library correctly', async () => {
  const provider = new TextLkSmsProvider({
    apiKey: 'test-api-key',
    from: 'TextLkTest',
  });

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'success', data: { uid: 'mock-uid-123' } }),
  });
  global.fetch = fetchMock;

  const result = await provider.sendMessage({
    content: 'Your otp code is 32901',
    from: 'TextLkTest',
    to: '+94771234567',
  });

  expect(fetchMock).toHaveBeenCalledWith(
    'https://app.text.lk/api/v3/sms/send',
    expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test-api-key',
      }),
      body: '{"recipient":"+94771234567","sender_id":"TextLkTest","type":"plain","message":"Your otp code is 32901"}',
    })
  );
  expect(result.id).toBe('mock-uid-123');
});

test('should trigger Text.lk library correctly with _passthrough', async () => {
  const provider = new TextLkSmsProvider({
    apiKey: 'test-api-key',
    from: 'TextLkTest',
  });

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'success', data: { uid: 'mock-uid-456' } }),
  });
  global.fetch = fetchMock;

  await provider.sendMessage(
    {
      content: 'Your otp code is 32901',
      from: 'TextLkTest',
      to: '+94771234567',
    },
    {
      _passthrough: {
        body: {
          recipient: '+94770000000',
        },
      },
    }
  );

  expect(fetchMock).toHaveBeenCalledWith(
    'https://app.text.lk/api/v3/sms/send',
    expect.objectContaining({
      body: '{"recipient":"+94770000000","sender_id":"TextLkTest","type":"plain","message":"Your otp code is 32901"}',
    })
  );
});

test('should reject when Text.lk returns an error response', async () => {
  const provider = new TextLkSmsProvider({
    apiKey: 'test-api-key',
    from: 'TextLkTest',
  });

  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 422,
    json: () => Promise.resolve({ status: 'error', message: 'Insufficient balance' }),
  });

  await expect(
    provider.sendMessage({
      content: 'Your otp code is 32901',
      from: 'TextLkTest',
      to: '+94771234567',
    })
  ).rejects.toThrow('Text.lk SMS error: Insufficient balance');
});
