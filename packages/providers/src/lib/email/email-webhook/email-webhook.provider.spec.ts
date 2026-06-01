import * as dns from 'node:dns';
import * as http from 'node:http';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { EmailWebhookProvider } from './email-webhook.provider';

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
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 'ok' }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('listen failed');
  directServerUrl = `http://127.0.0.1:${addr.port}/webhook`;
  serverUrl = `http://test-email-webhook.invalid:${addr.port}/webhook`;
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
      if (hostname === 'test-email-webhook.invalid') {
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

  test('should trigger email-webhook-provider library correctly', async () => {
    const provider = new EmailWebhookProvider({
      webhookUrl: serverUrl,
      hmacSecretKey: 'super-secret-key',
      retryDelay: 1,
      retryCount: 1,
    });

    const testTo = 'johndoe@example.com';
    const testFrom = 'janedoe@example.com';

    const payload = {
      to: [testTo],
      from: testFrom,
      subject: 'test',
      html: '<h1>test</h1>',
      text: 'test',
    };

    await provider.sendMessage(payload);

    expect(lastRequest).not.toBeNull();
    expect(lastRequest?.method).toBe('POST');
    expect(lastRequest?.body).toBe(
      '{"to":["johndoe@example.com"],"from":"janedoe@example.com","subject":"test","html":"<h1>test</h1>","text":"test"}'
    );
    expect(lastRequest?.headers['x-novu-signature']).toBe(
      'd1e94cd19eeceec2e0717e36f7edacaa93612b311bde8756ee35b89d4a994767'
    );
  });

  test('should trigger email-webhook-provider library correctly with _passthrough', async () => {
    const provider = new EmailWebhookProvider({
      webhookUrl: serverUrl,
      hmacSecretKey: 'super-secret-key',
      retryDelay: 1,
      retryCount: 1,
    });

    const testTo = 'johndoe@example.com';
    const testFrom = 'janedoe@example.com';

    const payload = {
      to: [testTo],
      from: testFrom,
      subject: 'test',
      html: '<h1>test</h1>',
      text: 'test',
    };

    await provider.sendMessage(payload, {
      _passthrough: {
        body: {
          subject: 'test _passthrough',
        },
      },
    });

    expect(lastRequest?.body).toBe(
      '{"to":["johndoe@example.com"],"from":"janedoe@example.com","subject":"test _passthrough","html":"<h1>test</h1>","text":"test"}'
    );
    expect(lastRequest?.headers['x-novu-signature']).toBe(
      'b0bfe55e55cfc925891858e6a7a77d1da5e3917321ae4f440e1e81843b2f5fa7'
    );
  });

  test('should reject the request when the URL resolves to a private IP', async () => {
    const provider = new EmailWebhookProvider({
      webhookUrl: 'http://127.0.0.2:8080/webhook',
      hmacSecretKey: 'super-secret-key',
      retryDelay: 1,
      retryCount: 1,
    });

    await expect(
      provider.sendMessage({
        to: ['johndoe@example.com'],
        from: 'janedoe@example.com',
        subject: 'test',
        html: '<h1>test</h1>',
        text: 'test',
      })
    ).rejects.toThrow(/Email webhook URL blocked/);
  });

  test('should reject non-http schemes', async () => {
    const provider = new EmailWebhookProvider({
      webhookUrl: 'file:///etc/passwd',
      hmacSecretKey: 'super-secret-key',
      retryDelay: 1,
      retryCount: 1,
    });

    await expect(
      provider.sendMessage({
        to: ['johndoe@example.com'],
        from: 'janedoe@example.com',
        subject: 'test',
        html: '<h1>test</h1>',
        text: 'test',
      })
    ).rejects.toThrow(/Invalid URL format|Email webhook URL blocked/);
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
    const provider = new EmailWebhookProvider({
      webhookUrl: directServerUrl,
      hmacSecretKey: 'super-secret-key',
      retryDelay: 1,
      retryCount: 1,
    });

    await provider.sendMessage({
      to: ['johndoe@example.com'],
      from: 'janedoe@example.com',
      subject: 'test',
      html: '<h1>test</h1>',
      text: 'test',
    });

    expect(lastRequest).not.toBeNull();
    expect(lastRequest?.method).toBe('POST');
  });
});
