import axios from 'axios';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UnifonicSmsProvider } from './unifonic.provider';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as {
  post: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  mockedAxios.post = vi.fn(); // Reset mock before each test
});

describe('UnifonicSmsProvider', () => {
  test('should trigger Unifonic SMS API correctly', async () => {
    const provider = new UnifonicSmsProvider({
      appSid: 'testSender',
      senderId: 'testSender',
    });

    mockedAxios.post.mockResolvedValue({
      data: {
        messageID: '123456789',
      },
    });

    await provider.sendMessage({
      to: '966123456789',
      content: 'Hi there',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://el.cloud.unifonic.com/rest/SMS/messages',
      expect.stringContaining('AppSid=testSender'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    );
  });

  test('should throw error if messageID is missing', async () => {
    const provider = new UnifonicSmsProvider({
      appSid: 'dummy',
      senderId: 'dummy',
    });

    mockedAxios.post.mockResolvedValue({
      data: {},
    });

    await expect(
      provider.sendMessage({
        to: '966123456789',
        content: 'Test',
      })
    ).rejects.toThrow('Unifonic SMS failed');
  });
});
