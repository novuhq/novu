/* eslint-disable @typescript-eslint/no-explicit-any */

import { HttpClient } from './http-client';

// Mock the global fetch function
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('HttpClient', () => {
  let httpClient: HttpClient;

  beforeEach(() => {
    httpClient = new HttpClient();
    mockFetch.mockClear();

    // Default mock implementation for fetch
    mockFetch.mockImplementation(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({ data: { result: 'success' } }),
      } as Response;
    });
  });

  describe('Constructor', () => {
    it('should use default options when none provided', () => {
      const client = new HttpClient();
      expect((client as any).apiUrl).toBe('https://api.novu.co/v1');
      expect((client as any).apiVersion).toBe('v1');
      expect((client as any).headers['User-Agent']).toBe(`${PACKAGE_NAME}@${PACKAGE_VERSION}`);
    });

    it('should use custom options when provided', () => {
      const client = new HttpClient({
        apiUrl: 'https://custom-api.example.com',
        apiVersion: 'v2',
        userAgent: 'custom-agent',
      });
      expect((client as any).apiUrl).toBe('https://custom-api.example.com/v2');
      expect((client as any).apiVersion).toBe('v2');
      expect((client as any).headers['User-Agent']).toBe('custom-agent');
    });
  });

  describe('setAuthorizationToken', () => {
    it('should set the Authorization header with Bearer token', () => {
      httpClient.setAuthorizationToken('test-token');
      expect((httpClient as any).headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('setHeaders', () => {
    it('should merge new headers with existing ones', () => {
      const initialContentType = (httpClient as any).headers['Content-Type'];
      httpClient.setHeaders({
        'X-Custom-Header': 'custom-value',
      });

      expect((httpClient as any).headers['Content-Type']).toBe(initialContentType);
      expect((httpClient as any).headers['X-Custom-Header']).toBe('custom-value');
    });
  });

  describe('HTTP methods', () => {
    it('should make a GET request', async () => {
      await httpClient.get('/test-path');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe('https://api.novu.co/v1/test-path');
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
    });

    it('should make a GET request with search params', async () => {
      const searchParams = new URLSearchParams({ key: 'value' });
      await httpClient.get('/test-path', searchParams);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];

      expect(url).toBe('https://api.novu.co/v1/test-path?key=value');
    });

    it('should make a POST request with body', async () => {
      const body = { data: 'test-data' };
      await httpClient.post('/test-path', body);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe('https://api.novu.co/v1/test-path');
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(body));
    });

    it('should make a PATCH request with body', async () => {
      const body = { data: 'test-data' };
      await httpClient.patch('/test-path', body);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe('https://api.novu.co/v1/test-path');
      expect(options.method).toBe('PATCH');
      expect(options.body).toBe(JSON.stringify(body));
    });

    it('should make a DELETE request with body', async () => {
      const body = { id: 'test-id' };
      await httpClient.delete('/test-path', body);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];

      expect(url).toBe('https://api.novu.co/v1/test-path');
      expect(options.method).toBe('DELETE');
      expect(options.body).toBe(JSON.stringify(body));
    });
  });

  describe('response handling', () => {
    it('should unwrap envelope by default', async () => {
      mockFetch.mockImplementationOnce(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { result: 'success' } }),
        } as Response;
      });

      const result = await httpClient.get('/test-path');
      expect(result).toEqual({ result: 'success' });
    });

    it('should return full response when unwrapEnvelope is false', async () => {
      mockFetch.mockImplementationOnce(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { result: 'success' }, meta: { page: 1 } }),
        } as Response;
      });

      const result = await httpClient.get('/test-path', undefined, false);
      expect(result).toEqual({ data: { result: 'success' }, meta: { page: 1 } });
    });

    it('should return undefined for 204 status', async () => {
      mockFetch.mockImplementationOnce(async () => {
        return {
          ok: true,
          status: 204,
          json: async () => ({}),
        } as Response;
      });

      const result = await httpClient.delete('/test-path');
      expect(result).toBeUndefined();
    });

    it('should throw error for non-ok responses', async () => {
      mockFetch.mockImplementationOnce(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({ message: 'Bad Request' }),
        } as Response;
      });

      await expect(httpClient.get('/test-path')).rejects.toThrow(
        `${PACKAGE_NAME}@${PACKAGE_VERSION} error. Status: 400, Message: Bad Request`
      );
    });
  });

  describe('URL handling', () => {
    it('should properly append query parameters', async () => {
      const searchParams = new URLSearchParams();
      searchParams.append('limit', '10');
      searchParams.append('filter', 'active');

      await httpClient.get('/test-path', searchParams);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.novu.co/v1/test-path?limit=10&filter=active');
    });

    it('should handle paths with leading and trailing slashes', async () => {
      await httpClient.get('//test-path//');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.novu.co/v1/test-path');
    });

    it('should handle empty path segments', async () => {
      await httpClient.get('test-path///nested');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.novu.co/v1/test-path/nested');
    });
  });
});
