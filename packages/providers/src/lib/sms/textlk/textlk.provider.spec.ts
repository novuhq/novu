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
