import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { AppioPushProvider } from './appio.provider';

vi.mock('axios');

const mockAxios = {
  post: vi.fn(),
  create: () => mockAxios,
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(axios as any).create = () => mockAxios;

const AppIOBaseUrl = 'https://api.io.italia.it/api/v1';
const provider = new AppioPushProvider({ AppIOBaseUrl });

describe('AppioPushProvider.sendMessage', () => {
  beforeEach(() => {
    mockAxios.post.mockReset();
  });

  it('should throw error if no API key provided', async () => {
    await expect(
      provider.sendMessage(
        {
          title: 'Test',
          content: 'This is a sample push notification message created for testing purposes and verifying delivery.',
          target: ['AAAAAA00A00A000A'],
          payload: {},
          subscriber: {},
          step: { digest: false, events: undefined, total_count: undefined },
        },
        {}
      )
    ).rejects.toThrow('Missing App IO API key');
  });

  it('should throw error if recipient is not allowed', async () => {
    mockAxios.post.mockImplementationOnce(() => Promise.resolve({ status: 200, data: { sender_allowed: false } }));
    await expect(
      provider.sendMessage(
        {
          title: 'Test',
          content: 'This is a sample push notification message created for testing purposes and verifying delivery.',
          target: ['AAAAAA00A00A000A'],
          payload: {},
          subscriber: {},
          step: { digest: false, events: undefined, total_count: undefined },
        },
        { apiKey: 'da7cb25ee26943ef966063700000000e' }
      )
    ).rejects.toThrow('Recipient is not allowed or not found in App IO');
  });

  it('should send message and return id and date', async () => {
    mockAxios.post
      .mockImplementationOnce(() => Promise.resolve({ status: 200, data: { sender_allowed: true } }))
      .mockImplementationOnce(() => Promise.resolve({ data: { id: 'msg-id-123' } }));

    const res = await provider.sendMessage(
      {
        title: 'Test',
        content: 'This is a sample push notification message created for testing purposes and verifying delivery.',
        target: ['AAAAAA00A00A000A'],
        payload: {},
        subscriber: {},
        step: { digest: false, events: undefined, total_count: undefined },
      },
      { apiKey: 'da7cb25ee26943ef966063700000000e' }
    );
    expect(res.id).toBe('msg-id-123');
    expect(typeof res.date).toBe('string');
  });
});
