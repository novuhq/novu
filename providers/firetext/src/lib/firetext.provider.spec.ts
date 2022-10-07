import { FiretextSmsProvider } from './firetext.provider';
import fetchMock from 'fetch-mock';

describe('FiretextSmsProvider', () => {
  const date = new Date('2022-01-01T00:00:00.000Z');

  const provider = new FiretextSmsProvider({
    apiKey: 'apiKey',
    from: 'testFrom',
  });

  afterEach(() => {
    fetchMock.reset();
  });

  test('should trigger firetext library correctly', async () => {
    fetchMock.mock('*', {
      headers: {
        'X-Message': 'ID',
        'Content-Type': 'text/plain',
        Date: date.toString(),
      },
      body: '0:12 SMS successfully queued',
    });

    const result = await provider.sendMessage({
      content: 'content',
      to: '+44123456789',
    });

    expect(result).toMatchObject({ id: 'ID', date: date.toISOString() });
  });

  test('should call fetch correctly', async () => {
    fetchMock.mock('*', {
      headers: {
        'X-Message': 'ID',
        'Content-Type': 'text/plain',
      },
      body: '0:12 SMS successfully queued',
    });

    const result = await provider.sendMessage({
      content: 'content',
      to: '+44123456789',
    });

    expect(fetchMock.lastUrl()).toBe(
      'https://www.firetext.co.uk/api/sendsms?apiKey=apiKey&to=%2B44123456789&from=testFrom&message=content'
    );
  });

  test('should throw error', async () => {
    fetchMock.mock('*', {
      headers: {
        'X-Message': 'ID',
        'Content-Type': 'text/plain',
      },
      body: '1:0 Authentication error',
    });

    const result = provider.sendMessage({
      content: 'content',
      to: '+44123456789',
    });

    await expect(result).rejects.toThrowError('1: Authentication error');
  });

  test('should handle unknown return codes', async () => {
    fetchMock.mock('*', {
      headers: {
        'X-Message': 'ID',
        'Content-Type': 'text/plain',
      },
      body: 'gobbledygook',
    });

    const result = provider.sendMessage({
      content: 'content',
      to: '+44123456789',
    });

    await expect(result).rejects.toThrowError(
      'Unknown status code: Unknown status message'
    );
  });
});
