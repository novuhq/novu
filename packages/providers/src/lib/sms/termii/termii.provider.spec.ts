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
    ok: true,
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
    })
  );
});

test('should trigger termii library correctly with _passthrough', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
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
    }
  );

  expect(fetchMock).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      body: '{"to":"+3347063317344","from":"TermiiTest","sms":"Your otp code is 32901","type":"plain","channel":"generic","api_key":"SG."}',
    })
  );
});

test('should throw when termii responds with an HTTP error', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 400,
    json: () => Promise.resolve({ message: 'Insufficient balance' }),
  });

  await expect(
    provider.sendMessage({
      content: 'Your otp code is 32901',
      to: '+2347063317344',
    })
  ).rejects.toThrow('Termii error: Insufficient balance');
});

test('should throw when termii responds without a message_id', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ message: 'Something went wrong' }),
  });

  await expect(
    provider.sendMessage({
      content: 'Your otp code is 32901',
      to: '+2347063317344',
    })
  ).rejects.toThrow('Termii error: Something went wrong');
});

test('should throw a Termii error when the error response is not JSON', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 502,
    json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
  });

  await expect(
    provider.sendMessage({
      content: 'Your otp code is 32901',
      to: '+2347063317344',
    })
  ).rejects.toThrow('Termii error: 502');
});
