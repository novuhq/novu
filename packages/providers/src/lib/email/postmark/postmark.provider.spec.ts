import { expect, test, vi } from 'vitest';
import { PostmarkEmailProvider } from './postmark.provider';

const mockConfig = {
  apiKey: '<postmark-id>',
  from: 'test@test.com',
};

const mockNovuMessage = {
  to: ['test2@test.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [{ mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' }],
};

const mockMessage = {
  To: 'receiver@example.com',
  SubmittedAt: '2014-02-17T07:25:01.4178645-05:00',
  MessageID: '883953f4-6105-42a2-a16a-77a8eac79483',
  ErrorCode: 0,
  Message: 'OK',
};

const mockWebHook = {
  MessageID: '883953f4-6105-42a2-a16a-77a8eac79483',
  Recipient: 'john@example.com',
  DeliveredAt: '2019-11-05T16:33:54.9070259Z',
  Details: 'Test delivery webhook details',
  Tag: 'welcome-email',
  ServerID: 23,
  Metadata: {
    a_key: 'a_value',
    b_key: 'b_value',
  },
  RecordType: 'Delivery',
  MessageStream: 'outbound',
};

test('should trigger postmark correctly', async () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const spy = vi.spyOn((provider as any).client, 'sendEmail').mockImplementation(async () => {
    return {};
  });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    From: mockConfig.from,
    To: mockNovuMessage.to[0],
    HtmlBody: mockNovuMessage.html,
    TextBody: mockNovuMessage.html,
    Subject: mockNovuMessage.subject,
    Attachments: [
      {
        Name: 'test.txt',
        Content: Buffer.from('test').toString('base64'),
        ContentID: null,
        ContentType: 'text/plain',
      },
    ],
  });
});

test('should forward custom headers in Postmark Headers format', async () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const spy = vi.spyOn((provider as any).client, 'sendEmail').mockImplementation(async () => {
    return {};
  });

  await provider.sendMessage({
    ...mockNovuMessage,
    headers: {
      'In-Reply-To': '<original-message-id@example.com>',
      References: '<original-message-id@example.com>',
    },
  });

  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({
      Headers: [
        { Name: 'In-Reply-To', Value: '<original-message-id@example.com>' },
        { Name: 'References', Value: '<original-message-id@example.com>' },
      ],
    })
  );
});

test('should not add Headers field when no custom headers provided', async () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const spy = vi.spyOn((provider as any).client, 'sendEmail').mockImplementation(async () => {
    return {};
  });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalledWith(
    expect.not.objectContaining({
      Headers: expect.anything(),
    })
  );
});

test('should trigger postmark correctly with _passthrough', async () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const spy = vi.spyOn((provider as any).client, 'sendEmail').mockImplementation(async () => {
    return {};
  });

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        From: 'hello@test.com',
      },
    },
  });

  expect(spy).toHaveBeenCalledWith({
    From: 'hello@test.com',
    To: mockNovuMessage.to[0],
    HtmlBody: mockNovuMessage.html,
    TextBody: mockNovuMessage.html,
    Subject: mockNovuMessage.subject,
    Attachments: [
      {
        Name: 'test.txt',
        Content: Buffer.from('test').toString('base64'),
        ContentID: null,
        ContentType: 'text/plain',
      },
    ],
  });
});

test('should send a Postmark-hosted template when _passthrough sets TemplateId', async () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const sendEmailSpy = vi.spyOn((provider as any).client, 'sendEmail').mockImplementation(async () => ({}));
  const sendTemplateSpy = vi
    .spyOn((provider as any).client, 'sendEmailWithTemplate')
    .mockImplementation(async () => ({ MessageID: 'template-message-id', SubmittedAt: '2026-11-23T00:00:00Z' }));

  const response = await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        TemplateId: 1234567,
        TemplateModel: { firstName: 'Jane' },
        MessageStream: 'outbound',
      },
    },
  });

  expect(sendEmailSpy).not.toHaveBeenCalled();
  expect(sendTemplateSpy).toHaveBeenCalledWith({
    From: mockConfig.from,
    To: mockNovuMessage.to[0],
    TemplateId: 1234567,
    TemplateModel: { firstName: 'Jane' },
    MessageStream: 'outbound',
    Attachments: [
      {
        Name: 'test.txt',
        Content: Buffer.from('test').toString('base64'),
        ContentID: null,
        ContentType: 'text/plain',
      },
    ],
  });
  expect(response.id).toBe('template-message-id');
});

test('should send a Postmark-hosted template by TemplateAlias with an empty TemplateModel by default', async () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const sendTemplateSpy = vi
    .spyOn((provider as any).client, 'sendEmailWithTemplate')
    .mockImplementation(async () => ({}));

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: { body: { TemplateAlias: 'welcome' } },
  });

  const sent = sendTemplateSpy.mock.calls[0][0] as Record<string, unknown>;
  expect(sent.TemplateAlias).toBe('welcome');
  expect(sent.TemplateModel).toEqual({});
  expect(sent).not.toHaveProperty('HtmlBody');
  expect(sent).not.toHaveProperty('TextBody');
  expect(sent).not.toHaveProperty('Subject');
});

test('should keep using /email for passthrough without a template', async () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const sendEmailSpy = vi.spyOn((provider as any).client, 'sendEmail').mockImplementation(async () => ({}));
  const sendTemplateSpy = vi.spyOn((provider as any).client, 'sendEmailWithTemplate');

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: { body: { MessageStream: 'broadcast', Tag: 'welcome' } },
  });

  expect(sendTemplateSpy).not.toHaveBeenCalled();
  expect(sendEmailSpy).toHaveBeenCalledWith(
    expect.objectContaining({ MessageStream: 'broadcast', Tag: 'welcome', Subject: mockNovuMessage.subject })
  );
});

test('should get message ID', () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  expect(provider.getMessageId(mockMessage)).toEqual(['883953f4-6105-42a2-a16a-77a8eac79483']);
});

test('should parse postmark webhook', () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const identifier = '883953f4-6105-42a2-a16a-77a8eac79483';
  const currentDateTimestamp = new Date().getTime();
  const { date, ...result } = provider.parseEventBody(mockWebHook, identifier);

  /*
   * Checking difference between current timestamp and timestamp received from result,
   * to be less than 5 seconds
   */
  expect(Math.abs(currentDateTimestamp - new Date(date).getTime())).toBeLessThanOrEqual(5000);

  expect(result).toStrictEqual({
    status: 'delivered',
    externalId: '883953f4-6105-42a2-a16a-77a8eac79483',
    attempts: 1,
    response: '',
    row: mockWebHook,
  });
});

test('should check provider integration correctly', async () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  const spy = vi.spyOn((provider as any).client, 'sendEmail').mockImplementation(async () => {
    return {};
  });

  const response = await provider.checkIntegration(mockNovuMessage);
  expect(spy).toHaveBeenCalled();
  expect(response.success).toBe(true);
});
