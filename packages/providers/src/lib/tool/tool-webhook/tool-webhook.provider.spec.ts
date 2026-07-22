import * as dns from 'node:dns';
import * as http from 'node:http';
import { ENDPOINT_TYPES, ToolWebhookData } from '@novu/stateless';
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
let serverPort: number;
let lastRequest: { url: string; method: string; headers: http.IncomingHttpHeaders; body: string } | null = null;

function urlFor(path: string): string {
  return `http://test-tool-webhook.invalid:${serverPort}${path}`;
}

function toolWebhookChannelData(endpoint: Partial<ToolWebhookData['endpoint']>): ToolWebhookData {
  return {
    type: ENDPOINT_TYPES.TOOL_WEBHOOK,
    identifier: 'tool-webhook-endpoint-1',
    endpoint: endpoint as ToolWebhookData['endpoint'],
  };
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
      res.end(JSON.stringify({ id: 'sig-123' }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const addr = server.address();
  if (!addr || typeof addr === 'string') throw new Error('listen failed');
  serverPort = addr.port;
});

afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('static: POSTs compiled content to the configured URL', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: urlFor('/static'),
    method: 'POST',
  });

  const result = await provider.sendMessage({ content: 'tool payload' });

  expect(result.id).toBe('sig-123');
  expect(lastRequest).not.toBeNull();
  expect(lastRequest!.url).toBe('/static');
  expect(lastRequest!.method).toBe('POST');
  expect(JSON.parse(lastRequest!.body)).toEqual({ content: 'tool payload' });
});

test('static: shallow-merges the body template with the step payload, step keys winning', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: urlFor('/static'),
    bodyTemplate: JSON.stringify({ source: 'integration', content: 'template-default', extra: 'kept' }),
  });

  await provider.sendMessage({ content: 'step-content' });

  expect(JSON.parse(lastRequest!.body)).toEqual({
    source: 'integration',
    extra: 'kept',
    content: 'step-content',
  });
});

test('static: shallow-merges customData into the body template, customData winning', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: urlFor('/static'),
    bodyTemplate: JSON.stringify({ source: 'integration', priority: 'low' }),
  });

  await provider.sendMessage({
    content: 'step-content',
    customData: { priority: 'high', ticketId: 'T-1' },
  });

  expect(JSON.parse(lastRequest!.body)).toEqual({
    source: 'integration',
    priority: 'high',
    ticketId: 'T-1',
    content: 'step-content',
  });
});

test('static: throws when webhookUrl is not configured', async () => {
  const provider = new ToolWebhookProvider({});

  await expect(provider.sendMessage({ content: 'x' })).rejects.toThrow(/not configured/i);
});

test('dynamic: routes to channelData.endpoint.url and overrides method', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: urlFor('/static'),
    method: 'POST',
  });

  await provider.sendMessage({
    content: 'dynamic payload',
    channelData: toolWebhookChannelData({ url: urlFor('/dynamic'), method: 'PUT' }),
  });

  expect(lastRequest!.url).toBe('/dynamic');
  expect(lastRequest!.method).toBe('PUT');
  expect(JSON.parse(lastRequest!.body)).toEqual({ content: 'dynamic payload' });
});

test('dynamic: defaults to POST and the integration method when endpoint.method is absent', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: urlFor('/static'),
    method: 'PATCH',
  });

  await provider.sendMessage({
    content: 'x',
    channelData: toolWebhookChannelData({ url: urlFor('/dynamic') }),
  });

  expect(lastRequest!.method).toBe('PATCH');
});

test('dynamic: throws when channelData.endpoint.url is missing', async () => {
  const provider = new ToolWebhookProvider({ webhookUrl: urlFor('/static') });

  await expect(
    provider.sendMessage({
      content: 'x',
      channelData: toolWebhookChannelData({ url: '' }),
    })
  ).rejects.toThrow(/endpoint is missing url/i);
});

test('falls back to static routing when channelData is a different endpoint type', async () => {
  const provider = new ToolWebhookProvider({ webhookUrl: urlFor('/static') });

  await provider.sendMessage({
    content: 'x',
    channelData: {
      type: ENDPOINT_TYPES.SLACK_CHANNEL,
      identifier: 's-1',
      endpoint: { channelId: 'C123' },
      token: 'xoxb-test',
    },
  });

  expect(lastRequest!.url).toBe('/static');
});

test('dynamic: merges integration headers with endpoint headers, endpoint winning on conflict', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: urlFor('/static'),
    headers: { 'x-integration-only': 'integration', 'x-custom': 'integration' },
  });

  await provider.sendMessage({
    content: 'x',
    channelData: toolWebhookChannelData({
      url: urlFor('/dynamic'),
      headers: { 'x-endpoint-only': 'endpoint', 'x-custom': 'endpoint' },
    }),
  });

  expect(lastRequest!.headers['x-integration-only']).toBe('integration');
  expect(lastRequest!.headers['x-endpoint-only']).toBe('endpoint');
  expect(lastRequest!.headers['x-custom']).toBe('endpoint');
});

test('sets the X-Novu-Signature header when a secret key is configured', async () => {
  const hmacSecretKey = 'super-secret-key';
  const provider = new ToolWebhookProvider({
    webhookUrl: urlFor('/static'),
    hmacSecretKey,
  });

  await provider.sendMessage({ content: 'tool payload' });

  const expectedSignature = crypto.createHmac('sha256', hmacSecretKey).update(lastRequest!.body, 'utf-8').digest('hex');
  expect(lastRequest!.headers['x-novu-signature']).toBe(expectedSignature);
});

test('omits the X-Novu-Signature header when no secret key is configured', async () => {
  const provider = new ToolWebhookProvider({ webhookUrl: urlFor('/static') });

  await provider.sendMessage({ content: 'unsigned' });

  expect(lastRequest!.headers['x-novu-signature']).toBeUndefined();
});

test('static: rejects a blocked hostname before sending', async () => {
  const provider = new ToolWebhookProvider({ webhookUrl: 'http://localhost/webhook' });

  await expect(provider.sendMessage({ content: 'x' })).rejects.toThrow(/blocked/i);
  expect(lastRequest).toBeNull();
});

test('dynamic: rejects a blocked endpoint hostname before sending', async () => {
  const provider = new ToolWebhookProvider({ webhookUrl: urlFor('/static') });

  await expect(
    provider.sendMessage({
      content: 'x',
      channelData: toolWebhookChannelData({ url: 'http://localhost/webhook' }),
    })
  ).rejects.toThrow(/blocked/i);
  expect(lastRequest).toBeNull();
});

test('throws when body template is invalid JSON', async () => {
  const provider = new ToolWebhookProvider({
    webhookUrl: urlFor('/static'),
    bodyTemplate: '{not-json',
  });

  await expect(provider.sendMessage({ content: 'x' })).rejects.toThrow(
    'Tool webhook body template must be valid JSON.'
  );
});
