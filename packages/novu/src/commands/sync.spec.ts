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
      vi.restoreAllMocks();
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

    it('prints the API error body and exits on a non-2xx response without leaking the secret key', async () => {
      const secretKey = 'not-a-real-key';
      const errorBody = { statusCode: 400, message: ['bridgeUrl is not reachable'], error: 'Bad Request' };
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code})`);
      }) as never);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (axios.post as MockedFunction<typeof axios.post>).mockResolvedValueOnce({ status: 400, data: errorBody });

      await expect(sync('https://bridge.novu.co', secretKey, 'https://api.novu.co')).rejects.toThrow('process.exit(1)');

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.anything(),
        expect.objectContaining({ validateStatus: expect.any(Function) })
      );
      const validateStatus = (axios.post as MockedFunction<typeof axios.post>).mock.calls[0][2]?.validateStatus;
      expect(validateStatus?.(400)).toBe(true);
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const printed = String(consoleErrorSpy.mock.calls[0][0]);
      expect(printed).toBe(`Error: ${JSON.stringify(errorBody)}`);
      expect(printed).not.toContain(secretKey);
      expect(axios.put).not.toHaveBeenCalled();
    });

    it('prints only the error message and exits on a network error without leaking the secret key', async () => {
      const secretKey = 'not-a-real-key';
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
        throw new Error(`process.exit(${code})`);
      }) as never);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const networkError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:4999'), {
        config: { headers: { Authorization: `ApiKey ${secretKey}` } },
      });

      (axios.post as MockedFunction<typeof axios.post>).mockRejectedValueOnce(networkError);

      await expect(sync('https://bridge.novu.co', secretKey, 'https://api.novu.co')).rejects.toThrow('process.exit(1)');

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const printed = consoleErrorSpy.mock.calls[0][0];
      expect(printed).toBeInstanceOf(Error);
      expect(printed).not.toBe(networkError);
      expect((printed as Error).message).toBe('Failed to sync with the Novu API: connect ECONNREFUSED 127.0.0.1:4999');
      expect(Object.keys(printed as Error)).toEqual([]);
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
