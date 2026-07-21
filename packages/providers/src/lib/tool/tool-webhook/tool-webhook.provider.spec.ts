import * as dns from 'node:dns';
import * as http from 'node:http';
import crypto from 'crypto';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { ToolWebhookProvider } from './tool-webhook.provider';

const ORIGINAL_ALLOW = process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
beforeAll(() => {
  process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = '127.0.0.1';
  const realLookup = dns.promises.lookup.bind(dns.promises);
  vi.spyOn(dns.promises, 'lookup').mockImplementation(((hostname: string, opts: any): any => {
    if (hostname === 'test-tool-webhook.invalid') {
      const result = [{ address: '127.0.0.1', family: 4 }];

      return Promise.resolve(opts && opts.all ? result : result[0]);
    }

    return realLookup(hostname as any, opts);
  }) as any);
});
afterAll(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_ALLOW === undefined) {
    delete process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
  } else {
    process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = ORIGINAL_ALLOW;
  }
});

let server: http.Server;
let serverUrl: string;
let lastRequest: { url: string; method: string; headers: http.IncomingHttpHeaders; body: string } | null = null;

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
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'sig-123' }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('listen failed');
  serverUrl = `http://test-tool-webhook.invalid:${addr.port}/webhook`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('POSTs compiled content to the configured URL and sets HMAC header when secret present', async () => {
  const hmacSecretKey = 'super-secret-key';
  const provider = new ToolWebhookProvider({
    webhookUrl: serverUrl,
    method: 'POST',
    hmacSecretKey,
  });

  const result = await provider.sendMessage({
    content: 'tool payload',
  });

  expect(result.id).toBe('sig-123');
  expect(lastRequest).not.toBeNull();
  expect(lastRequest!.method).toBe('POST');
  expect(JSON.parse(lastRequest!.body)).toEqual({ content: 'tool payload' });

  const expectedSignature = crypto.createHmac('sha256', hmacSecretKey).update(lastRequest!.body, 'utf-8').digest('hex');
  expect(lastRequest!.headers['x-novu-signature']).toBe(expectedSignature);
});

test('omits HMAC header when secret is not configured', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: serverUrl,
    method: 'POST',
  });

  await provider.sendMessage({ content: 'unsigned' });

  expect(lastRequest!.headers['x-novu-signature']).toBeUndefined();
});

test('throws when body template is invalid JSON', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: serverUrl,
    method: 'POST',
    bodyTemplate: '{not-json',
  });

  await expect(provider.sendMessage({ content: 'x' })).rejects.toThrow(
    'Tool webhook body template must be valid JSON.'
  );
});
