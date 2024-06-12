const axios = require('axios');

import { sync, buildSignature } from './sync';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('sync command', () => {
  describe('sync function', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });

    test('happy case of execute discover and  execute sync functions', async () => {
      const echoUrl = 'https://echo.novu.co';
      const novuApiKey = 'your-api-key';
      const backendUrl = 'https://api.novu.co';
      const discoverData = { workflows: [{ name: 'My Workflow' }] };
      const syncData = { someData: 'from sync' };

      const discoverRestCallSpy = jest.spyOn(mockedAxios, 'get');
      const syncRestCallSpy = jest.spyOn(mockedAxios, 'post');

      mockedAxios.get.mockResolvedValueOnce({ data: discoverData });
      mockedAxios.post.mockResolvedValueOnce({ data: syncData });

      const response = await sync(echoUrl, novuApiKey, backendUrl);

      const expectEchoUrl = `${echoUrl}?action=discover`;
      expect(discoverRestCallSpy).toHaveBeenCalledWith(
        expectEchoUrl,
        expect.objectContaining({
          headers: { 'x-novu-signature': expect.any(String) },
        })
      );
      const expectBackendUrl = `${backendUrl}/v1/echo/sync?source=cli`;
      expect(syncRestCallSpy).toHaveBeenCalledWith(
        expectBackendUrl,
        expect.objectContaining({ bridgeUrl: echoUrl, ...discoverData }),
        expect.objectContaining({ headers: { Authorization: expect.any(String), 'Content-Type': 'application/json' } })
      );
      expect(response).toEqual(syncData);
    });

    test('syncState - API error on discover', async () => {
      const echoUrl = 'https://echo.novu.co';
      const novuApiKey = 'your-api-key';
      const backendUrl = 'https://api.novu.co';

      const syncRestCallSpy = jest.spyOn(mockedAxios, 'post');

      mockedAxios.get.mockRejectedValueOnce(new Error('API error'));

      try {
        await sync(echoUrl, novuApiKey, backendUrl);
      } catch (error) {
        expect(error.message).toBe('API error');
      }

      expect(syncRestCallSpy).not.toHaveBeenCalled(); // syncRestCall shouldn't be called
    });

    test('syncState - network error on sync', async () => {
      const echoUrl = 'https://echo.novu.co';
      const novuApiKey = 'your-api-key';
      const backendUrl = 'https://api.novu.co';

      const discoverData = { workflows: [{ name: 'My Workflow' }] };
      mockedAxios.get.mockResolvedValueOnce({ data: discoverData });
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      try {
        await sync(echoUrl, novuApiKey, backendUrl);
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    test('syncState - unexpected error', async () => {
      const echoUrl = 'https://echo.novu.co';
      const novuApiKey = 'your-api-key';
      const backendUrl = 'https://api.novu.co';

      mockedAxios.get.mockResolvedValueOnce({ data: {} });
      mockedAxios.post.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      try {
        await sync(echoUrl, novuApiKey, backendUrl);
      } catch (error) {
        expect(error.message).toBe('Unexpected error');
      }
    });
  });

  describe('buildSignature function', () => {
    test('buildSignature - generates valid signature format', () => {
      const novuApiKey = 'your-api-key';
      const signature = buildSignature(novuApiKey);

      expect(signature).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/); // Matches format: t=<timestamp>,v1=<hex hash>
    });

    test('buildSignature - generates different signatures for different timestamps', async () => {
      const novuApiKey = 'your-api-key';
      const signature1 = buildSignature(novuApiKey);

      // make sure we have different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const signature2 = buildSignature(novuApiKey);

      expect(signature1).not.toEqual(signature2); // Check for different hashes with different timestamps
    });
  });
});
