import * as http from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect } from 'chai';
import { HttpClientService } from './http-client.service';
import { HttpClientError, HttpClientErrorType } from './http-client.types';

type RetryEvent = { attemptCount: number; statusCode?: number; errorCode?: string; delay: number };

const ORIGINAL_ALLOW = process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;

function createService(): HttpClientService {
  const logger = {
    setContext: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  return new HttpClientService(logger);
}

describe('HttpClientService — SSRF-safe path retries', () => {
  let server: http.Server;
  let baseUrl: string;
  let hitCount: number;
  let handler: (req: http.IncomingMessage, res: http.ServerResponse) => void;

  beforeAll(() => {
    process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = '127.0.0.1';
  });

  afterAll(() => {
    if (ORIGINAL_ALLOW === undefined) {
      delete process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
    } else {
      process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = ORIGINAL_ALLOW;
    }
  });

  beforeEach(async () => {
    hitCount = 0;
    handler = (_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    };

    server = http.createServer((req, res) => {
      hitCount += 1;
      handler(req, res);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('retries on a retryable status code and eventually succeeds', async () => {
    const retries: RetryEvent[] = [];
    handler = (_req, res) => {
      if (hitCount < 3) {
        res.writeHead(503);
        res.end('try again');

        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    };

    const service = createService();
    const response = await service.request<{ ok: boolean }>({
      url: baseUrl,
      method: 'GET',
      enforceSsrfProtection: true,
      retry: { limit: 3 },
      onRetry: (event) => retries.push(event),
    });

    expect(response.statusCode).to.equal(200);
    expect(response.body).to.deep.equal({ ok: true });
    expect(hitCount).to.equal(3);
    expect(retries).to.have.lengthOf(2);
    expect(retries[0]).to.include({ attemptCount: 1, statusCode: 503 });
    expect(retries[1]).to.include({ attemptCount: 2, statusCode: 503 });
  });

  it('throws after exhausting the retry budget', async () => {
    const retries: RetryEvent[] = [];
    handler = (_req, res) => {
      res.writeHead(503);
      res.end('always down');
    };

    const service = createService();
    let caught: unknown;
    try {
      await service.request({
        url: baseUrl,
        method: 'GET',
        enforceSsrfProtection: true,
        retry: { limit: 2 },
        onRetry: (event) => retries.push(event),
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(HttpClientError);
    expect((caught as HttpClientError).statusCode).to.equal(503);
    // 1 initial attempt + 2 retries.
    expect(hitCount).to.equal(3);
    expect(retries).to.have.lengthOf(2);
  });

  it('does not retry on a non-retryable status code', async () => {
    const retries: RetryEvent[] = [];
    handler = (_req, res) => {
      res.writeHead(400);
      res.end('bad request');
    };

    const service = createService();
    let caught: unknown;
    try {
      await service.request({
        url: baseUrl,
        method: 'GET',
        enforceSsrfProtection: true,
        retry: { limit: 3 },
        onRetry: (event) => retries.push(event),
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(HttpClientError);
    expect((caught as HttpClientError).statusCode).to.equal(400);
    expect(hitCount).to.equal(1);
    expect(retries).to.have.lengthOf(0);
  });

  it('does not retry an SSRF policy rejection', async () => {
    const retries: RetryEvent[] = [];
    const service = createService();

    let caught: unknown;
    try {
      await service.request({
        url: 'http://localhost/blocked',
        method: 'GET',
        enforceSsrfProtection: true,
        retry: { limit: 3 },
        onRetry: (event) => retries.push(event),
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(HttpClientError);
    expect((caught as HttpClientError).type).to.equal(HttpClientErrorType.SSRF_BLOCKED);
    expect(retries).to.have.lengthOf(0);
  });

  it('retries on a socket timeout (ETIMEDOUT)', async () => {
    const retries: RetryEvent[] = [];
    handler = (_req, res) => {
      // Never respond within the timeout window on the first attempt; respond fast afterwards.
      if (hitCount < 2) {
        return;
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    };

    const service = createService();
    const response = await service.request<{ ok: boolean }>({
      url: baseUrl,
      method: 'GET',
      timeout: 150,
      enforceSsrfProtection: true,
      retry: { limit: 2 },
      onRetry: (event) => retries.push(event),
    });

    expect(response.statusCode).to.equal(200);
    expect(retries).to.have.lengthOf(1);
    expect(retries[0]).to.include({ attemptCount: 1, errorCode: 'ETIMEDOUT' });
  });

  it('classifies an exhausted timeout as TIMEOUT and preserves the ETIMEDOUT code', async () => {
    handler = () => {
      // Never respond so every attempt hits the socket timeout.
    };

    const service = createService();
    let caught: unknown;
    try {
      await service.request({
        url: baseUrl,
        method: 'GET',
        timeout: 100,
        enforceSsrfProtection: true,
        retry: { limit: 1 },
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(HttpClientError);
    expect((caught as HttpClientError).type).to.equal(HttpClientErrorType.TIMEOUT);
    expect((caught as HttpClientError).networkCode).to.equal('ETIMEDOUT');
  });
});
