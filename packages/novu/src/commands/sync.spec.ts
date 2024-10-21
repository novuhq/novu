import { expect, it, describe, afterEach, vi, MockedFunction } from 'vitest';
import axios from 'axios';

import { sync, buildSignature } from './sync';

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
