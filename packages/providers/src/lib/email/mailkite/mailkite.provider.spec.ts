import { IEmailOptions } from '@novu/stateless';
import { beforeEach, expect, test, vi } from 'vitest';
import { MailKiteEmailProvider } from './mailkite.provider';

beforeEach(() => {
  vi.restoreAllMocks();
});

const mockConfig = {
  apiKey: 'mk_live_test-key',
  from: 'test@test.com',
};

const mockNovuMessage: IEmailOptions = {
  from: 'test@test.com',
  to: ['recipient@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  replyTo: 'no-reply@mailkite.dev',
  attachments: [
    {
      mime: 'text/plain',
      file: Buffer.from('test'),
      name: 'test.txt',
    },
  ],
};

function mockOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  };
}

test('should send an email through the mailkite api', async () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(mockOkResponse({ id: 'msg_123', status: 'sent' }) as any);

  const provider = new MailKiteEmailProvider(mockConfig);
  const result = await provider.sendMessage(mockNovuMessage);

  expect(result.id).toBe('msg_123');
  expect(result.date).toEqual(expect.any(String));
  expect(fetchSpy).toHaveBeenCalled();
  const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
  expect(url).toBe('https://api.mailkite.dev/v1/send');
  expect(init.method).toBe('POST');
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer mk_live_test-key');
  expect(JSON.parse(init.body as string)).toEqual({
    from: mockNovuMessage.from,
    to: mockNovuMessage.to,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
    replyTo: mockNovuMessage.replyTo,
    attachments: [
      {
        filename: 'test.txt',
        content: Buffer.from('test').toString('base64'),
        contentType: 'text/plain',
      },
    ],
  });
});

test('should format the from address with a sender name', async () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(mockOkResponse({ id: 'msg_456', status: 'sent' }) as any);

  const provider = new MailKiteEmailProvider({ ...mockConfig, senderName: 'Test User' });
  await provider.sendMessage(mockNovuMessage);

  const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
  expect(JSON.parse(init.body as string).from).toBe('Test User <test@test.com>');
});

test('should throw when the mailkite api rejects a send', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' } as any);

  const provider = new MailKiteEmailProvider(mockConfig);
  await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('MailKite send failed: 401');
});

test('should report a successful integration check', async () => {
  const fetchSpy = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(mockOkResponse({ email: 'test@test.com', emailVerified: true, plan: 'free' }) as any);

  const provider = new MailKiteEmailProvider(mockConfig);
  const result = await provider.checkIntegration(mockNovuMessage);

  expect(result.success).toBe(true);
  const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
  expect(url).toBe('https://api.mailkite.dev/v1/me');
  expect((init.headers as Record<string, string>).Authorization).toBe('Bearer mk_live_test-key');
});

test('should report a failed integration check on an unauthorized api key', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' } as any);

  const provider = new MailKiteEmailProvider(mockConfig);
  const result = await provider.checkIntegration(mockNovuMessage);

  expect(result.success).toBe(false);
});
