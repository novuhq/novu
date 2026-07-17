import { createHmac } from 'node:crypto';
import { IEmailOptions } from '@novu/stateless';
import { beforeEach, expect, test, vi } from 'vitest';
import { AnypostEmailProvider } from './anypost.provider';

const mockConfig = {
  apiKey: 'ap_test_key',
  from: 'test@test.com',
};

const mockNovuMessage: IEmailOptions = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  replyTo: 'no-reply@novu.co',
  attachments: [
    {
      mime: 'text/plain',
      file: Buffer.from('test'),
      name: 'test.txt',
    },
  ],
};

const mockNovuMessageWithContentId: IEmailOptions = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<img src="cid:logo" alt="logo" />',
  subject: 'Test subject',
  replyTo: 'no-reply@novu.co',
  attachments: [
    {
      mime: 'image/png',
      file: Buffer.from('test'),
      name: 'logo.png',
      cid: 'logo',
    },
  ],
};

// Spy on the internal SDK send and resolve with a realistic 202 body.
function spyOnSend(provider: AnypostEmailProvider) {
  return vi
    .spyOn((provider as any).anypost.email, 'send')
    .mockResolvedValue({ id: 'email_019e1972-e87e-7000-bf74-ba09e0ed0d62', created_at: '2026-06-24T12:00:00.000Z' });
}

test('maps a Novu message to an Anypost send request', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalledTimes(1);
  expect(spy.mock.calls[0]).toHaveLength(1); // no idempotency arg without options.id
  expect(spy.mock.calls[0][0]).toEqual({
    from: 'test@test.com',
    to: ['test@test.com'],
    subject: 'Test subject',
    cc: undefined,
    bcc: undefined,
    reply_to: 'no-reply@novu.co',
    attachments: [
      {
        filename: 'test.txt',
        content: Buffer.from('test'),
        content_type: 'text/plain',
      },
    ],
    html: '<div> Mail Content </div>',
    text: undefined,
  });
});

test('composes "Name <addr>" when a sender name is configured', async () => {
  const provider = new AnypostEmailProvider({ ...mockConfig, senderName: 'Test User' });
  const spy = spyOnSend(provider);

  await provider.sendMessage(mockNovuMessageWithContentId);

  expect(spy.mock.calls[0][0]).toMatchObject({
    from: 'Test User <test@test.com>',
  });
});

test('maps an inline attachment with a content id', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage(mockNovuMessageWithContentId);

  expect((spy.mock.calls[0][0] as any).attachments).toEqual([
    {
      filename: 'logo.png',
      content: Buffer.from('test'),
      content_type: 'image/png',
      content_id: 'logo',
    },
  ]);
});

test('drops attachments whose file buffer is null', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage({
    ...mockNovuMessage,
    attachments: [
      { mime: 'text/plain', file: null, name: 'missing.txt' },
      { mime: 'text/plain', file: Buffer.from('ok'), name: 'ok.txt' },
    ],
  });

  expect((spy.mock.calls[0][0] as any).attachments).toEqual([
    { filename: 'ok.txt', content: Buffer.from('ok'), content_type: 'text/plain' },
  ]);
});

test('returns the Anypost email id and server timestamp', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  spyOnSend(provider);

  const result = await provider.sendMessage(mockNovuMessage);

  expect(result).toEqual({
    id: 'email_019e1972-e87e-7000-bf74-ba09e0ed0d62',
    date: '2026-06-24T12:00:00.000Z',
  });
});

test('honors a _passthrough override (highest priority)', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: { body: { subject: 'Overridden subject' } },
  });

  expect((spy.mock.calls[0][0] as any).subject).toBe('Overridden subject');
});

test('merges bridgeProviderData and transforms camelCase keys to snake_case', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage(mockNovuMessage, {
    tags: ['vip'],
    campaign: 'spring-2026',
    templateId: 'template_abc', // camelCase -> snake_case
  });

  const body = spy.mock.calls[0][0] as any;
  expect(body.tags).toEqual(['vip']);
  expect(body.campaign).toBe('spring-2026');
  expect(body.template_id).toBe('template_abc');
  expect((body as any).templateId).toBeUndefined();
  // A template_id supplied via a provider override must drop the inline
  // html/text body — Anypost rejects template_id combined with inline content.
  expect(body.html).toBeUndefined();
  expect(body.text).toBeUndefined();
});

test('surfaces a stored template + variables from customData and omits inline body', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage({
    ...mockNovuMessage,
    customData: { templateId: 'template_z', variables: { name: 'Ada' } },
  });

  const body = spy.mock.calls[0][0] as any;
  expect(body.template_id).toBe('template_z');
  expect(body.variables).toEqual({ name: 'Ada' });
  expect(body.html).toBeUndefined();
  expect(body.text).toBeUndefined();
});

test('forwards Novu correlation ids as headers and the transaction id as the idempotency key', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage({
    ...mockNovuMessage,
    id: 'msg_1',
    notificationDetails: {
      transactionId: 'tx_1',
      workflowIdentifier: 'welcome',
      subscriberId: 'sub_1',
    },
  });

  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({
      headers: {
        'X-Novu-Transaction-Id': 'tx_1',
        'X-Novu-Message-Id': 'msg_1',
        'X-Novu-Workflow-Identifier': 'welcome',
        'X-Novu-Subscriber-Id': 'sub_1',
      },
    }),
    { idempotencyKey: 'msg_1' }
  );
});

test('merges user headers over correlation headers', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage({
    ...mockNovuMessage,
    headers: { 'X-Custom': 'abc' },
    notificationDetails: { transactionId: 'tx_9' },
  });

  expect((spy.mock.calls[0][0] as any).headers).toEqual({
    'X-Novu-Transaction-Id': 'tx_9',
    'X-Custom': 'abc',
  });
});

test('checkIntegration resolves SUCCESS when whoami succeeds', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  vi.spyOn((provider as any).anypost, 'whoami').mockResolvedValue({
    team: { id: 'team_1', name: 'Acme' },
    api_key: { id: 'key_1', permissions: 'full' },
  });

  const result = await provider.checkIntegration(mockNovuMessage);

  expect(result).toEqual({
    success: true,
    message: 'Integrated successfully!',
    code: 'success',
  });
});

test('checkIntegration maps an auth error to BAD_CREDENTIALS', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  vi.spyOn((provider as any).anypost, 'whoami').mockRejectedValue({
    type: 'authentication_error',
    message: 'The API key is invalid.',
  });

  const result = await provider.checkIntegration(mockNovuMessage);

  expect(result).toEqual({
    success: false,
    message: 'The API key is invalid.',
    code: 'bad_credentials',
  });
});

test('checkIntegration maps an unknown error to FAILED', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  vi.spyOn((provider as any).anypost, 'whoami').mockRejectedValue({
    type: 'internal_error',
    message: 'boom',
  });

  const result = await provider.checkIntegration(mockNovuMessage);

  expect(result).toEqual({ success: false, message: 'boom', code: 'failed' });
});

const webhookDelivery = {
  batch_id: 'batch_1',
  timestamp: 1_750_000_000,
  events: [
    {
      id: 'evt_1',
      type: 'email.delivered',
      occurred_at: '2026-06-24T12:00:01.000Z',
      data: { email_id: 'email_aaa' },
    },
    {
      id: 'evt_2',
      type: 'email.bounced',
      occurred_at: '2026-06-24T12:00:02.000Z',
      data: { email_id: 'email_bbb', attempt: 2, bounce_classification: 'InvalidRecipient' },
    },
  ],
};

test('getMessageId extracts every email id from a delivery batch', () => {
  const provider = new AnypostEmailProvider(mockConfig);

  expect(provider.getMessageId(webhookDelivery as any)).toEqual(['email_aaa', 'email_bbb']);
});

test('parseEventBody maps a delivered event', () => {
  const provider = new AnypostEmailProvider(mockConfig);

  expect(provider.parseEventBody(webhookDelivery as any, 'email_aaa')).toEqual({
    status: 'delivered',
    date: '2026-06-24T12:00:01.000Z',
    externalId: 'email_aaa',
    row: JSON.stringify(webhookDelivery.events[0]),
  });
});

test('parseEventBody maps a bounced event with attempts and response', () => {
  const provider = new AnypostEmailProvider(mockConfig);

  expect(provider.parseEventBody(webhookDelivery as any, 'email_bbb')).toEqual({
    status: 'bounced',
    date: '2026-06-24T12:00:02.000Z',
    externalId: 'email_bbb',
    attempts: 2,
    response: 'InvalidRecipient',
    row: JSON.stringify(webhookDelivery.events[1]),
  });
});

test('parseEventBody returns undefined for an unknown identifier', () => {
  const provider = new AnypostEmailProvider(mockConfig);

  expect(provider.parseEventBody(webhookDelivery as any, 'email_missing')).toBeUndefined();
});

test('parseEventBody returns undefined for an unmapped event type', () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const body = { events: [{ id: 'evt', type: 'webhook.test', occurred_at: 'now', data: { email_id: 'email_x' } }] };

  expect(provider.parseEventBody(body as any, 'email_x')).toBeUndefined();
});

test('verifySignature passes through when no signing key is configured', async () => {
  const provider = new AnypostEmailProvider(mockConfig);

  const result = await provider.verifySignature({ rawBody: '{}', headers: {} });

  expect(result.success).toBe(true);
});

test('verifySignature accepts a valid Anypost-Signature header', async () => {
  const secret = 'whsec_test_secret';
  const provider = new AnypostEmailProvider({ ...mockConfig, webhookSigningKey: secret });
  const rawBody = JSON.stringify(webhookDelivery);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');

  const result = await provider.verifySignature({
    rawBody,
    headers: { 'Anypost-Signature': `t=${timestamp},v1=${signature}` },
  });

  expect(result.success).toBe(true);
});

test('verifySignature rejects a tampered signature', async () => {
  const secret = 'whsec_test_secret';
  const provider = new AnypostEmailProvider({ ...mockConfig, webhookSigningKey: secret });
  const timestamp = Math.floor(Date.now() / 1000);

  const result = await provider.verifySignature({
    rawBody: '{}',
    headers: { 'Anypost-Signature': `t=${timestamp},v1=deadbeef` },
  });

  expect(result.success).toBe(false);
});

test('verifySignature reports a missing header', async () => {
  const provider = new AnypostEmailProvider({ ...mockConfig, webhookSigningKey: 'whsec_x' });

  const result = await provider.verifySignature({ rawBody: '{}', headers: {} });

  expect(result).toEqual({ success: false, message: 'Missing Anypost-Signature header' });
});

test('autoConfigureInboundWebhook creates a webhook and returns the signing key', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = vi.spyOn((provider as any).anypost.webhooks, 'create').mockResolvedValue({
    id: 'wh_1',
    signing_secret: 'whsec_live_123',
  });

  const result = await provider.autoConfigureInboundWebhook({ webhookUrl: 'https://novu.example/webhook' });

  expect(spy).toHaveBeenCalledWith({
    name: 'Novu Inbound Webhook',
    url: 'https://novu.example/webhook',
    events: [
      'email.sent',
      'email.delivered',
      'email.delayed',
      'email.bounced',
      'email.complained',
      'email.suppressed',
      'email.unsubscribed',
      'email.opened',
      'email.clicked',
    ],
  });
  expect(result).toEqual({
    success: true,
    message: 'Anypost webhook configured successfully with signature verification enabled',
    configurations: {
      inboundWebhookEnabled: true,
      inboundWebhookSigningKey: 'whsec_live_123',
    },
  });
});

test('autoConfigureInboundWebhook reports a failure', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  vi.spyOn((provider as any).anypost.webhooks, 'create').mockRejectedValue(new Error('forbidden'));

  const result = await provider.autoConfigureInboundWebhook({ webhookUrl: 'https://novu.example/webhook' });

  expect(result.success).toBe(false);
  expect(result.message).toContain('forbidden');
});

const statusCases: [string, string][] = [
  ['email.sent', 'sent'],
  ['email.delivered', 'delivered'],
  ['email.delayed', 'delayed'],
  ['email.bounced', 'bounced'],
  ['email.complained', 'complaint'],
  ['email.suppressed', 'dropped'], // no Novu "suppressed" status; the mapping deliberately collapses to DROPPED
  ['email.unsubscribed', 'unsubscribed'],
  ['email.opened', 'opened'],
  ['email.clicked', 'clicked'],
];

test.each(statusCases)('parseEventBody maps %s to status "%s"', (type, expected) => {
  const provider = new AnypostEmailProvider(mockConfig);
  const body = {
    events: [{ id: 'evt', type, occurred_at: '2026-06-24T12:00:00.000Z', data: { email_id: 'email_x' } }],
  };

  expect(provider.parseEventBody(body as any, 'email_x')?.status).toBe(expected);
});

test('parseEventBody derives response from smtp_code when there is no bounce_classification', () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const body = {
    events: [{ id: 'evt', type: 'email.bounced', occurred_at: 'now', data: { email_id: 'email_x', smtp_code: 550 } }],
  };

  expect(provider.parseEventBody(body as any, 'email_x')?.response).toBe('550');
});

test('parseEventBody prefers bounce_classification over smtp_code for response', () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const body = {
    events: [
      {
        id: 'evt',
        type: 'email.bounced',
        occurred_at: 'now',
        data: { email_id: 'email_x', bounce_classification: 'InvalidRecipient', smtp_code: 550 },
      },
    ],
  };

  expect(provider.parseEventBody(body as any, 'email_x')?.response).toBe('InvalidRecipient');
});

test('parseEventBody falls back to a generated date when occurred_at is absent', () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const body = { events: [{ id: 'evt', type: 'email.delivered', data: { email_id: 'email_x' } }] };

  expect(provider.parseEventBody(body as any, 'email_x')?.date).toMatch(/^\d{4}-\d{2}-\d{2}T/);
});

test('getMessageId accepts a bare event array', () => {
  const provider = new AnypostEmailProvider(mockConfig);

  expect(provider.getMessageId(webhookDelivery.events as any)).toEqual(['email_aaa', 'email_bbb']);
});

test('getMessageId accepts a single bare event', () => {
  const provider = new AnypostEmailProvider(mockConfig);

  expect(provider.getMessageId(webhookDelivery.events[0] as any)).toEqual(['email_aaa']);
});

test('getMessageId drops events without a string email_id', () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const body = {
    events: [
      { id: 'evt_1', type: 'email.delivered', occurred_at: 'now', data: { email_id: 'email_aaa' } },
      { id: 'evt_2', type: 'webhook.test', occurred_at: 'now', data: {} },
      { id: 'evt_3', type: 'email.bounced', occurred_at: 'now', data: { email_id: 42 } },
    ],
  };

  expect(provider.getMessageId(body as any)).toEqual(['email_aaa']);
});

test('sendMessage forwards populated cc and bcc arrays', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  const spy = spyOnSend(provider);

  await provider.sendMessage({ ...mockNovuMessage, cc: ['cc@novu.co'], bcc: ['bcc@novu.co'] });

  const body = spy.mock.calls[0][0] as any;
  expect(body.cc).toEqual(['cc@novu.co']);
  expect(body.bcc).toEqual(['bcc@novu.co']);
});

test('checkIntegration maps a permission error to BAD_CREDENTIALS with the default message', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  vi.spyOn((provider as any).anypost, 'whoami').mockRejectedValue({ type: 'permission_error' });

  const result = await provider.checkIntegration(mockNovuMessage);

  expect(result).toEqual({
    success: false,
    message: 'Anypost integration check failed',
    code: 'bad_credentials',
  });
});

test('verifySignature reports an undefined body', async () => {
  const provider = new AnypostEmailProvider({ ...mockConfig, webhookSigningKey: 'whsec_x' });

  const result = await provider.verifySignature({
    rawBody: undefined,
    headers: { 'Anypost-Signature': 't=1,v1=abc' },
  });

  expect(result).toEqual({ success: false, message: 'Body is undefined' });
});

test('autoConfigureInboundWebhook falls back to "Unknown error" for a message-less rejection', async () => {
  const provider = new AnypostEmailProvider(mockConfig);
  vi.spyOn((provider as any).anypost.webhooks, 'create').mockRejectedValue({});

  const result = await provider.autoConfigureInboundWebhook({ webhookUrl: 'https://novu.example/webhook' });

  expect(result.success).toBe(false);
  expect(result.message).toContain('Unknown error');
});

beforeEach(() => {
  vi.restoreAllMocks();
});
