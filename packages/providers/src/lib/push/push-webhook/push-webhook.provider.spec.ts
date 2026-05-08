import * as dns from 'node:dns';
import * as http from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { PushWebhookPushProvider } from './push-webhook.provider';

const ORIGINAL_ALLOW = process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
beforeAll(() => {
  // Tests need to actually open a socket to a local upstream. Allow only the
  // explicit loopback IP we bind to; the safe outbound layer keeps the policy
  // active for everything else.
  process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = '127.0.0.1';
  // Only mock our test hostname; everything else falls through to real dns
  // so that IP literals like 127.0.0.2 still resolve to themselves and trigger
  // the SSRF rejection path.
  const realLookup = dns.promises.lookup.bind(dns.promises);
  vi.spyOn(dns.promises, 'lookup').mockImplementation(((hostname: string, opts: any): any => {
    if (hostname === 'test-push-webhook.invalid') {
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
      res.end(JSON.stringify({ id: '123' }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('listen failed');
  serverUrl = `http://test-push-webhook.invalid:${addr.port}/webhook`;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('should trigger push-webhook library correctly', async () => {
  const provider = new PushWebhookPushProvider({
    webhookUrl: serverUrl,
    hmacSecretKey: 'super-secret-key',
  });

  const subscriber = {};
  const step = { digest: false, events: [{}], total_count: 1 };

  const result = await provider.sendMessage({
    title: 'Test',
    content: 'Test push',
    target: ['tester'],
    payload: { sound: 'test_sound' },
    subscriber,
    step,
  });

  expect(result.id).toBe('123');
  expect(lastRequest).not.toBeNull();
  expect(lastRequest!.method).toBe('POST');
  expect(JSON.parse(lastRequest!.body)).toEqual({
    title: 'Test',
    content: 'Test push',
    target: ['tester'],
    payload: { sound: 'test_sound', subscriber, step },
  });
  expect(lastRequest!.headers['x-novu-signature']).toBe(
    'ebb2ff6420df59a863a6ddfa64ca8721cbbce038d5432c441cde83dee43b70d9'
  );
});

test('should trigger push-webhook library correctly with _passthrough', async () => {
  const provider = new PushWebhookPushProvider({
    webhookUrl: serverUrl,
    hmacSecretKey: 'super-secret-key',
  });

  const subscriber = {};
  const step = { digest: false, events: [{}], total_count: 1 };

  const result = await provider.sendMessage(
    {
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: { sound: 'test_sound' },
      subscriber,
      step,
    },
    {
      _passthrough: { body: { content: 'test _passthrough' } },
    }
  );

  expect(result.id).toBe('123');
  expect(JSON.parse(lastRequest!.body)).toEqual({
    title: 'Test',
    content: 'test _passthrough',
    target: ['tester'],
    payload: { sound: 'test_sound', subscriber, step },
  });
  expect(lastRequest!.headers['x-novu-signature']).toBe(
    '5147e1613526bad56a1c0e318ebbdd7d312c7760dcb8230f3f4c80c07d9ebdd0'
  );
});

test('should reject the request when the URL resolves to a private IP', async () => {
  const provider = new PushWebhookPushProvider({
    webhookUrl: 'http://127.0.0.2:8080/webhook',
    hmacSecretKey: 'super-secret-key',
  });

  await expect(
    provider.sendMessage({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {},
      subscriber: {},
      step: { digest: false, events: [{}], total_count: 1 },
    })
  ).rejects.toThrow(/Push webhook URL blocked/);
});

test('should reject non-http schemes', async () => {
  const provider = new PushWebhookPushProvider({
    webhookUrl: 'file:///etc/passwd',
    hmacSecretKey: 'super-secret-key',
  });

  await expect(
    provider.sendMessage({
      title: 'Test',
      content: 'Test push',
      target: ['tester'],
      payload: {},
      subscriber: {},
      step: { digest: false, events: [{}], total_count: 1 },
    })
  ).rejects.toThrow(/Invalid URL format|Push webhook URL blocked/);
});
