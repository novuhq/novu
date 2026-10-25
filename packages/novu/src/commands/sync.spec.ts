import { agent, Client, NovuRequestHandler } from '@novu/framework';
import axios from 'axios';
import { afterEach, describe, expect, it, MockedFunction, vi } from 'vitest';

import { buildSignature, sync } from './sync';

vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
    },
  };
});

describe('sync command', () => {
  describe('sync function', () => {
    afterEach(() => {
      vi.clearAllMocks();
    });

    it('happy case of execute sync functions', async () => {
      const bridgeUrl = 'https://bridge.novu.co';
      const secretKey = 'your-api-key';
      const apiUrl = 'https://api.novu.co';
      const syncData = { someData: 'from sync' };

      const syncRestCallSpy = vi.spyOn(axios, 'post');

      (axios.post as MockedFunction<typeof axios.post>).mockResolvedValueOnce({
        data: syncData,
      });

      const response = await sync(bridgeUrl, secretKey, apiUrl);

      const expectBackendUrl = `${apiUrl}/v1/bridge/sync?source=cli`;
      expect(syncRestCallSpy).toHaveBeenCalledWith(
        expectBackendUrl,
        expect.objectContaining({ bridgeUrl }),
        expect.objectContaining({ headers: { Authorization: expect.any(String), 'Content-Type': 'application/json' } })
      );
      expect(response).toEqual(syncData);
    });

    it('sets the production bridge URL for agents served by a bridge with strict authentication', async () => {
      const bridgeUrl = 'https://bridge.novu.co';
      const secretKey = 'your-api-key';
      const apiUrl = 'https://api.novu.co';

      const bridge = new NovuRequestHandler({
        frameworkName: 'test',
        agents: [agent('support-bot', { onMessage: async () => {} })],
        client: new Client({ secretKey, strictAuthentication: true }),
        handler: (url: string, headers: Record<string, string>) => ({
          body: () => ({}),
          headers: (key: string) => headers[key] ?? null,
          method: () => 'GET',
          url: () => new URL(url),
          transformResponse: (res) => res,
        }),
      }).createHandler();

      (axios.post as MockedFunction<typeof axios.post>).mockResolvedValueOnce({ data: {} });
      (axios.get as MockedFunction<typeof axios.get>).mockImplementationOnce(async (url, config) => {
        const res = await bridge(url, (config?.headers ?? {}) as Record<string, string>);
        if (res.status !== 200) {
          throw new Error(res.body);
        }

        return { data: JSON.parse(res.body) };
      });
      (axios.put as MockedFunction<typeof axios.put>).mockResolvedValueOnce({ data: {} });

      await sync(bridgeUrl, secretKey, apiUrl);

      expect(axios.put).toHaveBeenCalledWith(
        `${apiUrl}/v1/agents/support-bot/bridge`,
        { bridgeUrl },
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: `ApiKey ${secretKey}` }) })
      );
    });

    it('syncState - network error on sync', async () => {
      const bridgeUrl = 'https://bridge.novu.co';
      const secretKey = 'your-api-key';
      const apiUrl = 'https://api.novu.co';

      (axios.post as MockedFunction<typeof axios.post>).mockRejectedValueOnce(new Error('Network error'));

      try {
        await sync(bridgeUrl, secretKey, apiUrl);
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('syncState - unexpected error', async () => {
      const bridgeUrl = 'https://bridge.novu.co';
      const secretKey = 'your-api-key';
      const apiUrl = 'https://api.novu.co';

      (axios.get as MockedFunction<typeof axios.get>).mockResolvedValueOnce({ data: {} });
      (axios.post as MockedFunction<typeof axios.post>).mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      try {
        await sync(bridgeUrl, secretKey, apiUrl);
      } catch (error) {
        expect(error.message).toBe('Unexpected error');
      }
    });
  });

  describe('buildSignature function', () => {
    it('buildSignature - generates valid signature format', () => {
      const secretKey = 'your-api-key';
      const signature = buildSignature(secretKey);

      expect(signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/); // Matches format: t=<timestamp>,v1=<hex hash>
    });

    it('buildSignature - generates different signatures for different timestamps', async () => {
      const secretKey = 'your-api-key';
      const signature1 = buildSignature(secretKey);

      // make sure we have different timestamps
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });

      const signature2 = buildSignature(secretKey);

      expect(signature1).not.toEqual(signature2); // Check for different hashes with different timestamps
    });
  });
});
