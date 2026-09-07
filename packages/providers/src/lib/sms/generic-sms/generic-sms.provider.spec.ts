import crypto from 'node:crypto';
import * as dns from 'node:dns';
import * as http from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { GenericSmsProvider } from './generic-sms.provider';

const ORIGINAL_ALLOW = process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
const ORIGINAL_ENTERPRISE = process.env.NOVU_ENTERPRISE;
const ORIGINAL_SELF_HOSTED = process.env.IS_SELF_HOSTED;

let server: http.Server;
let serverUrl: string;
let directServerUrl: string;
let lastRequest: { url: string; method: string; headers: http.IncomingHttpHeaders; body: string } | null = null;

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

beforeEach(async () => {
  lastRequest = null;
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      lastRequest = {
        url: req.url ?? '',
        method: req.method ?? 'GET',
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      };
      const messageId = crypto.randomUUID();
      const messageDate = new Date().toISOString();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          message: {
            id: messageId,
            date: messageDate,
          },
        })
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('listen failed');
  directServerUrl = `http://127.0.0.1:${addr.port}/`;
  serverUrl = `http://test-generic-sms.invalid:${addr.port}/`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe('with SSRF protection (enterprise cloud)', () => {
  beforeAll(() => {
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_SELF_HOSTED = 'false';
    process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = '127.0.0.1';
    const realLookup = dns.promises.lookup.bind(dns.promises);
    vi.spyOn(dns.promises, 'lookup').mockImplementation(((hostname: string, opts: unknown): unknown => {
      if (hostname === 'test-generic-sms.invalid') {
        const result = [{ address: '127.0.0.1', family: 4 }];

        return Promise.resolve(opts && typeof opts === 'object' && opts !== null && 'all' in opts ? result : result[0]);
      }

      return realLookup(hostname as string, opts as dns.LookupOptions);
    }) as typeof dns.promises.lookup);
  });

  afterAll(() => {
    vi.restoreAllMocks();
    restoreEnv('NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS', ORIGINAL_ALLOW);
    restoreEnv('NOVU_ENTERPRISE', ORIGINAL_ENTERPRISE);
    restoreEnv('IS_SELF_HOSTED', ORIGINAL_SELF_HOSTED);
  });

  test('should trigger generic-sms library correctly', async () => {
    const provider = new GenericSmsProvider({
      baseUrl: serverUrl,
      apiKeyRequestHeader: 'apiKey',
      apiKey: '123456',
      from: 'sender-id',
      idPath: 'message.id',
      datePath: 'message.date',
    });

    const result = await provider.sendMessage({
      to: '+1234567890',
      content: 'SMS Content form Generic SMS Provider',
    });

    expect(lastRequest).not.toBeNull();
    expect(lastRequest?.method).toBe('POST');
    expect(JSON.parse(lastRequest?.body ?? '{}')).toEqual({
      to: '+1234567890',
      content: 'SMS Content form Generic SMS Provider',
      sender: 'sender-id',
    });
    expect(lastRequest?.headers.apikey).toBe('123456');
    expect(result.id).toBeDefined();
    expect(result.date).toBeDefined();
  });

  test('should trigger generic-sms library correctly with _passthrough', async () => {
    const provider = new GenericSmsProvider({
      baseUrl: serverUrl,
      apiKeyRequestHeader: 'apiKey',
      apiKey: '123456',
      from: 'sender-id',
      idPath: 'message.id',
      datePath: 'message.date',
    });

    await provider.sendMessage(
      {
        to: '+1234567890',
        content: 'SMS Content form Generic SMS Provider',
      },
      {
        _passthrough: {
          body: {
            to: '+2234567890',
          },
        },
      }
    );

    expect(JSON.parse(lastRequest?.body ?? '{}')).toEqual({
      to: '+2234567890',
      content: 'SMS Content form Generic SMS Provider',
      sender: 'sender-id',
    });
  });

  test('should reject the request when the URL resolves to a private IP', async () => {
    const provider = new GenericSmsProvider({
      baseUrl: 'http://127.0.0.2:8080/',
      apiKeyRequestHeader: 'apiKey',
      apiKey: '123456',
      from: 'sender-id',
    });

    await expect(
      provider.sendMessage({
        to: '+1234567890',
        content: 'SMS Content form Generic SMS Provider',
      })
    ).rejects.toThrow(/Generic SMS URL blocked/);
  });

  test('should reject non-http schemes', async () => {
    const provider = new GenericSmsProvider({
      baseUrl: 'file:///etc/passwd',
      apiKeyRequestHeader: 'apiKey',
      apiKey: '123456',
      from: 'sender-id',
    });

    await expect(
      provider.sendMessage({
        to: '+1234567890',
        content: 'SMS Content form Generic SMS Provider',
      })
    ).rejects.toThrow(/Invalid URL format|Generic SMS URL blocked/);
  });
});

describe('without SSRF protection (self-hosted)', () => {
  beforeAll(() => {
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_SELF_HOSTED = 'true';
  });

  afterAll(() => {
    restoreEnv('NOVU_ENTERPRISE', ORIGINAL_ENTERPRISE);
    restoreEnv('IS_SELF_HOSTED', ORIGINAL_SELF_HOSTED);
  });

  test('should allow requests to private IPs via axios', async () => {
    const provider = new GenericSmsProvider({
      baseUrl: directServerUrl,
      apiKeyRequestHeader: 'apiKey',
      apiKey: '123456',
      from: 'sender-id',
      idPath: 'message.id',
      datePath: 'message.date',
    });

    const result = await provider.sendMessage({
      to: '+1234567890',
      content: 'SMS Content form Generic SMS Provider',
    });

    expect(lastRequest).not.toBeNull();
    expect(result.id).toBeDefined();
  });
});
