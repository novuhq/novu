import axios from 'axios';
import { createHmac } from 'crypto';
import { afterEach, describe, expect, it, MockedFunction, vi } from 'vitest';

import { buildSignature, sync } from './sync';

vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
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

    it('signs agent discovery so bridges with strict authentication accept it', async () => {
      const secretKey = 'your-api-key';
      (axios.post as MockedFunction<typeof axios.post>).mockResolvedValueOnce({ data: {} });
      (axios.get as MockedFunction<typeof axios.get>).mockResolvedValueOnce({ data: { workflows: [] } });

      await sync('https://bridge.novu.co', secretKey, 'https://api.novu.co');

      const [url, config] = (axios.get as MockedFunction<typeof axios.get>).mock.calls[0];
      const [, timestamp, hmac] = config?.headers?.['novu-signature'].match(/^t=(\d+),v1=([0-9a-f]{64})$/);
      expect(url).toBe('https://bridge.novu.co?action=discover');
      expect(hmac).toBe(createHmac('sha256', secretKey).update(`${timestamp}.{}`).digest('hex'));
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
