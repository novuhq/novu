import { afterEach, describe, expect, test, vi } from 'vitest';
import { FiretextSmsProvider } from './firetext.provider';

describe('FiretextSmsProvider', () => {
  const date = new Date('2022-01-01T00:00:00.000Z');

  const provider = new FiretextSmsProvider({
    apiKey: 'apiKey',
    from: 'testFrom',
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should trigger firetext library correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: {
        get: (header) => {
          if (header === 'X-Message') return 'ID';
          if (header === 'Content-Type') return 'text/plain';
          if (header === 'Date') return date.toString();
        },
      },
      text: () => Promise.resolve('0:12 SMS successfully queued'),
    });
    global.fetch = fetchMock;

    const result = await provider.sendMessage({
      content: 'content',
      to: '+44123456789',
    });

    expect(result).toMatchObject({ id: 'ID', date: date.toISOString() });
  });

  test('should call fetch correctly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: {
        get: (header) => {
          if (header === 'X-Message') return 'ID';
          if (header === 'Content-Type') return 'text/plain';
        },
      },
      text: () => Promise.resolve('0:12 SMS successfully queued'),
    });
    global.fetch = fetchMock;

    const result = await provider.sendMessage({
      content: 'content',
      to: '+44123456789',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.firetext.co.uk/api/sendsms?apiKey=apiKey&to=%2B44123456789&from=testFrom&message=content',
    );
  });

  test('should call fetch correctly with _passthrough', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: {
        get: (header) => {
          if (header === 'X-Message') return 'ID';
          if (header === 'Content-Type') return 'text/plain';
        },
      },
      text: () => Promise.resolve('0:12 SMS successfully queued'),
    });
    global.fetch = fetchMock;

    await provider.sendMessage(
      {
        content: 'content',
        to: '+44123456789',
      },
      {
        _passthrough: {
          body: {
            to: '+24123456789',
          },
        },
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.firetext.co.uk/api/sendsms?apiKey=apiKey&to=%2B24123456789&from=testFrom&message=content',
    );
  });

  test('should throw error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: {
        get: (header) => {
          if (header === 'X-Message') return 'ID';
          if (header === 'Content-Type') return 'text/plain';
        },
      },
      text: () => Promise.resolve('1:0 Authentication error'),
    });
    global.fetch = fetchMock;

    const result = provider.sendMessage({
      content: 'content',
      to: '+44123456789',
    });

    await expect(result).rejects.toThrowError('1: Authentication error');
  });

  test('should handle unknown return codes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      headers: {
        get: (header) => {
          if (header === 'X-Message') return 'ID';
          if (header === 'Content-Type') return 'text/plain';
        },
      },
      text: () => Promise.resolve('gobbledygook'),
    });
    global.fetch = fetchMock;

    const result = provider.sendMessage({
      content: 'content',
      to: '+44123456789',
    });

    await expect(result).rejects.toThrowError(
      'Unknown status code: Unknown status message',
    );
  });
});
