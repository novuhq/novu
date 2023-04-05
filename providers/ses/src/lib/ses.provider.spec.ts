import { EmailEventStatusEnum } from '@novu/stateless';
import { SESClient } from '@aws-sdk/client-ses';
import { SESEmailProvider } from './ses.provider';

const mockConfig = {
  region: 'test-1',
  senderName: 'Test',
  accessKeyId: 'TEST',
  from: 'test@test.com',
  secretAccessKey: 'TEST',
};

const mockNovuMessage = {
  to: ['test@test2.com'],
  replyTo: 'test@test1.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' },
  ],
};

const mockSESMessage = {
  eventType: 'Delivery',
  mail: {
    timestamp: '2016-10-19T23:20:52.240Z',
    source: 'sender@example.com',
    sourceArn: 'arn:aws:ses:us-east-1:123456789012:identity/sender@example.com',
    sendingAccountId: '123456789012',
    messageId: 'EXAMPLE7c191be45-e9aedb9a-02f9-4d12-a87d-dd0099a07f8a-000000',
    destination: ['recipient@example.com'],
    headersTruncated: false,
    headers: [
      {
        name: 'From',
        value: 'sender@example.com',
      },
      {
        name: 'To',
        value: 'recipient@example.com',
      },
      {
        name: 'Subject',
        value: 'Message sent from Amazon SES',
      },
      {
        name: 'MIME-Version',
        value: '1.0',
      },
      {
        name: 'Content-Type',
        value: 'text/html; charset=UTF-8',
      },
      {
        name: 'Content-Transfer-Encoding',
        value: '7bit',
      },
    ],
    commonHeaders: {
      from: ['sender@example.com'],
      to: ['recipient@example.com'],
      messageId: 'EXAMPLE7c191be45-e9aedb9a-02f9-4d12-a87d-dd0099a07f8a-000000',
      subject: 'Message sent from Amazon SES',
    },
    tags: {
      'ses:configuration-set': ['ConfigSet'],
      'ses:source-ip': ['192.0.2.0'],
      'ses:from-domain': ['example.com'],
      'ses:caller-identity': ['ses_user'],
      'ses:outgoing-ip': ['192.0.2.0'],
      myCustomTag1: ['myCustomTagValue1'],
      myCustomTag2: ['myCustomTagValue2'],
    },
  },
  delivery: {
    timestamp: '2016-10-19T23:21:04.133Z',
    processingTimeMillis: 11893,
    recipients: ['recipient@example.com'],
    smtpResponse: '250 2.6.0 Message received',
    reportingMTA: 'mta.example.com',
  },
};

test('should trigger ses library correctly', async () => {
  const mockResponse = { MessageId: 'mock-message-id' };
  const spy = jest
    .spyOn(SESClient.prototype, 'send')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mockResponse as any;
    });

  const provider = new SESEmailProvider(mockConfig);
  const response = await provider.sendMessage(mockNovuMessage);

  // eslint-disable-next-line
  const bufferArray = spy.mock.calls[0][0].input['RawMessage']['Data'];
  const buffer = Buffer.from(bufferArray);
  const emailContent = buffer.toString();

  expect(spy).toHaveBeenCalled();
  expect(emailContent.includes('Reply-To: test@test1.com')).toBe(true);
  expect(response.id).toEqual('<mock-message-id@test-1.amazonses.com>');
});

describe('getMessageId', () => {
  test('should return messageId when body is valid', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const messageId = provider.getMessageId(mockSESMessage);
    expect(messageId).toEqual([mockSESMessage.mail.messageId]);
  });

  test('should return messageId when body is array', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const messageId = provider.getMessageId([mockSESMessage]);
    expect(messageId).toEqual([mockSESMessage.mail.messageId]);
  });

  test('should return undefined when event body is undefined', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const messageId = provider.parseEventBody(undefined, 'test');
    expect(messageId).toBeUndefined();
  });

  test('should return undefined when event body is empty', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const messageId = provider.parseEventBody([], 'test');
    expect(messageId).toBeUndefined();
  });
});

describe('parseEventBody', () => {
  test('should return IEmailEventBody object when body is valid', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const eventBody = provider.parseEventBody(mockSESMessage, 'test');
    const dateISO = new Date(mockSESMessage.mail.timestamp).toISOString();
    expect(eventBody).toEqual({
      status: EmailEventStatusEnum.DELIVERED,
      date: dateISO,
      externalId: mockSESMessage.mail.messageId,
      attempts: undefined,
      response: undefined,
      row: mockSESMessage,
    });
  });

  test('should return undefined when event body is undefined', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const eventBody = provider.parseEventBody(undefined, 'test');
    expect(eventBody).toBeUndefined();
  });

  test('should return undefined when status is unrecognized', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const messageId = provider.parseEventBody(
      { event: 'not-real-event' },
      'test'
    );
    expect(messageId).toBeUndefined();
  });
});
