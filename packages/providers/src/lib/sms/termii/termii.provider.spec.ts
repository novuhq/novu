import { afterEach, expect, test, vi } from 'vitest';
import { TermiiSmsProvider } from './termii.provider';

afterEach(() => {
  vi.restoreAllMocks();
});

test('should trigger termii library correctly', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  const fetchMock = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ message_id: '1' }),
  });
  global.fetch = fetchMock;

  await provider.sendMessage({
    content: 'Your otp code is 32901',
    from: 'TermiiTest',
    to: '+2347063317344',
  });

  expect(fetchMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: '{"to":"+2347063317344","from":"TermiiTest","sms":"Your otp code is 32901","type":"plain","channel":"generic","api_key":"SG."}',
    }),
  );
});

test('should trigger termii library correctly with _passthrough', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  const fetchMock = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ message_id: '1' }),
  });
  global.fetch = fetchMock;

  await provider.sendMessage(
    {
      content: 'Your otp code is 32901',
      from: 'TermiiTest',
      to: '+2347063317344',
    },
    {
      _passthrough: {
        body: {
          to: '+3347063317344',
        },
      },
    },
  );

  expect(fetchMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: '{"to":"+3347063317344","from":"TermiiTest","sms":"Your otp code is 32901","type":"plain","channel":"generic","api_key":"SG."}',
    }),
  );
});
