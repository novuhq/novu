import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getResponse, getBridgeUrl } from './env.utils';

describe('env.utils', () => {
  describe('getResponse', () => {
    it('should return global Response if defined', () => {
      // @ts-expect-error - incorrect Response types
      global.Response = class {};
      const response = getResponse();
      expect(response).toBe(global.Response);
    });

    it('should return cross-fetch Response if global Response is undefined', () => {
      // @ts-expect-error - incorrect Response types
      global.Response = undefined;
      const response = getResponse();
      // eslint-disable-next-line global-require
      expect(response).toBe(require('cross-fetch').Response);
    });
  });

  describe('getBridgeUrl', () => {
    beforeEach(() => {
      delete process.env.NOVU_BRIDGE_ORIGIN;
      delete process.env.NEXT_PUBLIC_VERCEL_URL;
      delete process.env.NEXT_PUBLIC_VERCEL_ENV;
      // @ts-expect-error - overriding read-only property
      process.env.NODE_ENV = 'development';
    });

    it('should return NOVU_BRIDGE_ORIGIN if defined', async () => {
      process.env.NOVU_BRIDGE_ORIGIN = 'http://example.com';
      const url = await getBridgeUrl();
      expect(url).toBe('http://example.com/api/novu');
    });

    it('should return NEXT_PUBLIC_VERCEL_URL if NEXT_PUBLIC_VERCEL_ENV is preview', async () => {
      process.env.NEXT_PUBLIC_VERCEL_URL = 'vercel.example.com';
      process.env.NEXT_PUBLIC_VERCEL_ENV = 'preview';

      const url = await getBridgeUrl();
      expect(url).toBe('https://vercel.example.com/api/novu');
    });

    it('should return local bridge URL in development environment', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          tunnelOrigin: 'http://localhost:2022',
          route: '/api/novu',
        }),
      });
      global.fetch = mockFetch;
      const url = await getBridgeUrl();
      expect(url).toBe('http://localhost:2022/api/novu');
    });

    it('should return empty string if no conditions are met', async () => {
      // @ts-expect-error - overriding read-only property
      process.env.NODE_ENV = 'production';
      const url = await getBridgeUrl();
      expect(url).toBe('');
    });
  });
});
