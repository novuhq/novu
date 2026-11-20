import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { GroundmailEmailProvider } from './groundmail.provider';

const mockConfig = {
  apiKey: 'gm_test_key',
  from: 'default@example.com',
  senderName: 'Acme',
};

const mockNovuMessage = {
  from: 'hello@example.com',
  to: ['user@example.com'],
  html: '<div>Mail Content</div>',
  text: 'Mail Content',
  subject: 'Test subject',
};

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('should POST the mapped message to the Groundmail API', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_123', status: 'sent' }));
  const provider = new GroundmailEmailProvider(mockConfig);

  const result = await provider.sendMessage({
    ...mockNovuMessage,
    id: 'novu-message-1',
    notificationDetails: { transactionId: 'txn_1', jobId: 'job_1' },
    cc: ['cc@example.com'],
    bcc: ['bcc@example.com'],
    replyTo: 'reply@example.com',
    headers: { 'X-Entity-ID': 'ord_1' },
    customData: { tags: { order_id: 'ord_1' } },
    attachments: [{ file: Buffer.from('hello'), name: 'a.txt', mime: 'text/plain', cid: 'cid1' }],
  });

  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('https://api.groundmail.dev/emails');
  expect(init.method).toBe('POST');
  expect(init.headers.Authorization).toBe('Bearer gm_test_key');
  expect(init.headers['Idempotency-Key']).toBe('novu-job-job_1');
  expect(init.signal).toBeInstanceOf(AbortSignal);

  expect(JSON.parse(init.body)).toEqual({
    from: { email: 'hello@example.com', name: 'Acme' },
    to: ['user@example.com'],
    subject: 'Test subject',
    html: '<div>Mail Content</div>',
    text: 'Mail Content',
    cc: ['cc@example.com'],
    bcc: ['bcc@example.com'],
    reply_to: 'reply@example.com',
    headers: { 'X-Novu-Transaction-Id': 'txn_1', 'X-Novu-Job-Id': 'job_1', 'X-Entity-ID': 'ord_1' },
    tags: [{ name: 'order_id', value: 'ord_1' }],
    attachments: [
      { name: 'a.txt', content_type: 'text/plain', data: Buffer.from('hello').toString('base64'), content_id: 'cid1' },
    ],
  });
  expect(result.id).toBe('msg_123');
  expect(result.date).toBeDefined();
});

test('should fall back to the configured from address and omit the idempotency key without an id', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_1', status: 'sent' }));
  const provider = new GroundmailEmailProvider({ apiKey: 'k', from: 'default@example.com' });

  await provider.sendMessage({ to: ['u@example.com'], subject: 's', html: '<p>x</p>' });

  const [, init] = fetchMock.mock.calls[0];
  expect(init.headers['Idempotency-Key']).toBeUndefined();
  expect(JSON.parse(init.body).from).toBe('default@example.com');
});

test('should send the same idempotency key and body when a job is retried', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_1', status: 'sent' }));
  const provider = new GroundmailEmailProvider(mockConfig);
  const notificationDetails = { transactionId: 'txn_1', jobId: 'job_1' };

  // Each attempt of a job gets a new Novu message id.
  await provider.sendMessage({ ...mockNovuMessage, id: 'message-attempt-1', notificationDetails });
  await provider.sendMessage({ ...mockNovuMessage, id: 'message-attempt-2', notificationDetails });

  const [first, second] = fetchMock.mock.calls.map(([, init]) => init);
  expect(first.headers['Idempotency-Key']).toBe('novu-job-job_1');
  expect(second.headers['Idempotency-Key']).toBe(first.headers['Idempotency-Key']);
  expect(second.body).toBe(first.body);
});

test('should send different idempotency keys for different jobs in one transaction', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_1', status: 'sent' }));
  const provider = new GroundmailEmailProvider(mockConfig);

  await provider.sendMessage({ ...mockNovuMessage, notificationDetails: { transactionId: 'txn_1', jobId: 'job_a' } });
  await provider.sendMessage({ ...mockNovuMessage, notificationDetails: { transactionId: 'txn_1', jobId: 'job_b' } });

  const keys = fetchMock.mock.calls.map(([, init]) => init.headers['Idempotency-Key']);
  expect(keys).toEqual(['novu-job-job_a', 'novu-job-job_b']);
});

test('should use the caller id as the idempotency key when there is no job id', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_1', status: 'sent' }));
  const provider = new GroundmailEmailProvider(mockConfig);

  await provider.sendMessage({ ...mockNovuMessage, id: 'caller-id-1' });

  expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('caller-id-1');
});

test('should keep header names from bridge provider data as given', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_1', status: 'sent' }));
  const provider = new GroundmailEmailProvider(mockConfig);

  await provider.sendMessage(
    { ...mockNovuMessage, headers: { 'X-Trigger-Header': 'trigger' } },
    { replyTo: 'bridge@example.com', headers: { 'X-Entity-ID': 'ord_1', 'List-Unsubscribe': '<https://u.example>' } }
  );

  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.reply_to).toBe('bridge@example.com');
  expect(body.headers).toEqual({
    'X-Trigger-Header': 'trigger',
    'X-Entity-ID': 'ord_1',
    'List-Unsubscribe': '<https://u.example>',
  });
});

test('should apply bridge provider data overrides', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { id: 'msg_1', status: 'sent' }));
  const provider = new GroundmailEmailProvider(mockConfig);

  await provider.sendMessage(mockNovuMessage, { category: 'product', _passthrough: { body: { unsubscribe: true } } });

  const body = JSON.parse(fetchMock.mock.calls[0][1].body);
  expect(body.category).toBe('product');
  expect(body.unsubscribe).toBe(true);
});

test('should throw the API error message when the send fails', async () => {
  fetchMock.mockResolvedValue(jsonResponse(403, { error: { message: 'Domain is not verified', code: 'forbidden' } }));
  const provider = new GroundmailEmailProvider(mockConfig);

  await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('Domain is not verified');
});

test('should throw a generic message when the error body is not JSON', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 502,
    json: async () => {
      throw new Error('bad json');
    },
  } as unknown as Response);
  const provider = new GroundmailEmailProvider(mockConfig);

  await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('status 502');
});

test('checkIntegration succeeds on an authenticated read', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, { emails: [] }));
  const provider = new GroundmailEmailProvider(mockConfig);

  const result = await provider.checkIntegration(mockNovuMessage);

  expect(fetchMock.mock.calls[0][0]).toBe('https://api.groundmail.dev/emails?limit=1');
  expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  expect(result.success).toBe(true);
  expect(result.code).toBe('success');
});

test('checkIntegration accepts a valid key that lacks the read scope', async () => {
  fetchMock.mockResolvedValue(jsonResponse(403, { error: { message: 'scope', code: 'insufficient_scope' } }));
  const provider = new GroundmailEmailProvider(mockConfig);

  expect((await provider.checkIntegration(mockNovuMessage)).success).toBe(true);
});

test('checkIntegration reports bad credentials on 401', async () => {
  fetchMock.mockResolvedValue(jsonResponse(401, { error: { message: 'Invalid API key', code: 'unauthorized' } }));
  const provider = new GroundmailEmailProvider(mockConfig);

  const result = await provider.checkIntegration(mockNovuMessage);

  expect(result.success).toBe(false);
  expect(result.code).toBe('bad_credentials');
  expect(result.message).toBe('Invalid API key');
});

test('checkIntegration reports failure when the request throws', async () => {
  fetchMock.mockRejectedValue(new Error('network down'));
  const provider = new GroundmailEmailProvider(mockConfig);

  const result = await provider.checkIntegration(mockNovuMessage);

  expect(result.success).toBe(false);
  expect(result.message).toBe('network down');
});
