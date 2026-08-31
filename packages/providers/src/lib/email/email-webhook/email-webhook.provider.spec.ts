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

describe('with an allow-listed target', () => {
  beforeAll(() => {
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

describe('on self-hosted builds', () => {
  beforeAll(() => {
    delete process.env.NOVU_ENTERPRISE;
    process.env.IS_SELF_HOSTED = 'true';
    delete process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
  });

  afterAll(() => {
    restoreEnv('NOVU_ENTERPRISE', ORIGINAL_ENTERPRISE);
    restoreEnv('IS_SELF_HOSTED', ORIGINAL_SELF_HOSTED);
    restoreEnv('NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS', ORIGINAL_ALLOW);
  });

  test('should block loopback targets', async () => {
    const provider = new EmailWebhookProvider({
      webhookUrl: directServerUrl,
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

    expect(lastRequest).toBeNull();
  });

  test('should block the cloud metadata endpoint', async () => {
    const provider = new EmailWebhookProvider({
      webhookUrl: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/novu',
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

  test('should allow targets added to the outbound allow list', async () => {
    process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS = '127.0.0.1';

    try {
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
    } finally {
      delete process.env.NOVU_SAFE_OUTBOUND_TEST_ALLOW_IPS;
    }
  });
});

describe('computeHmac secret key encodings', () => {
  const PAYLOAD =
    '{"to":["johndoe@example.com"],"from":"janedoe@example.com","subject":"test","html":"<h1>test</h1>","text":"test"}';

  // Signature produced by the legacy behavior: the raw UTF-8 bytes of 'super-secret-key'.
  const TEXT_SIGNATURE = 'd1e94cd19eeceec2e0717e36f7edacaa93612b311bde8756ee35b89d4a994767';

  test.each([
    ['base64', Buffer.from('super-secret-key').toString('base64')],
    ['hex', Buffer.from('super-secret-key').toString('hex')],
  ])('should sign identically when a %s-encoded key decodes to the same binary material', (encoding, encodedKey) => {
    const provider = new EmailWebhookProvider({
      webhookUrl: 'https://example.com/webhook',
      hmacSecretKey: encodedKey,
      hmacSecretKeyEncoding: encoding as 'base64' | 'hex',
    });

    expect(provider.computeHmac(PAYLOAD)).toBe(TEXT_SIGNATURE);
  });

  test('should keep signing as plain text when no encoding is configured', () => {
    const provider = new EmailWebhookProvider({
      webhookUrl: 'https://example.com/webhook',
      hmacSecretKey: 'super-secret-key',
    });
    const explicitTextProvider = new EmailWebhookProvider({
      webhookUrl: 'https://example.com/webhook',
      hmacSecretKey: 'super-secret-key',
      hmacSecretKeyEncoding: 'text',
    });

    expect(provider.computeHmac(PAYLOAD)).toBe(TEXT_SIGNATURE);
    expect(explicitTextProvider.computeHmac(PAYLOAD)).toBe(provider.computeHmac(PAYLOAD));
  });

  test('should reject an empty decoded key for non-text encodings', () => {
    // Node's decoders are lenient: only a value with zero valid digits yields an empty buffer.
    const base64Provider = new EmailWebhookProvider({
      webhookUrl: 'https://example.com/webhook',
      hmacSecretKey: '!!!!',
      hmacSecretKeyEncoding: 'base64',
    });
    const missingKeyProvider = new EmailWebhookProvider({
      webhookUrl: 'https://example.com/webhook',
      hmacSecretKeyEncoding: 'hex',
    });

    expect(() => base64Provider.computeHmac(PAYLOAD)).toThrow(/not valid base64/);
    expect(() => missingKeyProvider.computeHmac(PAYLOAD)).toThrow(/requires a non-empty hmacSecretKey/);
  });

  test('should reject unsupported encodings instead of signing with unintended key bytes', () => {
    const provider = new EmailWebhookProvider({
      webhookUrl: 'https://example.com/webhook',
      hmacSecretKey: 'super-secret-key',
      // Runtime values are not constrained by the TypeScript union — the API persists raw strings.
      hmacSecretKeyEncoding: 'latin1' as 'base64' | 'hex',
    });

    expect(() => provider.computeHmac(PAYLOAD)).toThrow(/Unsupported hmacSecretKeyEncoding: 'latin1'/);
  });
});
