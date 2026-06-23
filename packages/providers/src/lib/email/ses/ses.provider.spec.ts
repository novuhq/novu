import { SESv2Client } from '@aws-sdk/client-sesv2';
import { EmailEventStatusEnum } from '@novu/stateless';
import { describe, expect, test, vi } from 'vitest';
import { SESEmailProvider } from './ses.provider';

// Stub sns-validator so URL/structure tests don't perform real HTTPS cert downloads.
// Tests assert the URL was either rejected before reaching the validator (Invalid AWS
// certificate URL) or reached it and surfaced this stub error.
vi.mock('sns-validator', () => ({
  default: class {
    validate(_msg: unknown, cb: (err: Error | null) => void) {
      cb(new Error('stubbed validator: signature not checked in unit tests'));
    }
  },
}));

const mockConfig = {
  region: 'us-east-1',
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
  attachments: [{ mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' }],
};

const mockSESMessage = {
  eventType: 'Delivery',
  Message: JSON.stringify({
    eventType: 'Delivery',
    mail: {
      timestamp: '2016-10-19T23:20:52.240Z',
      messageId: 'EXAMPLE7c191be45-e9aedb9a-02f9-4d12-a87d-dd0099a07f8a-000000',
      sourceArn: 'arn:aws:ses:us-east-1:123456789012:identity/sender@example.com',
    },
  }),
  Type: 'Notification',
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
  const spy = vi.spyOn(SESv2Client.prototype, 'send').mockImplementation(async () => {
    return mockResponse as any;
  });

  const provider = new SESEmailProvider(mockConfig);
  const response = await provider.sendMessage(mockNovuMessage);

  const bufferArray = spy.mock.calls[0][0].input['Content']['Raw']['Data'];
  const buffer = Buffer.from(bufferArray);
  const emailContent = buffer.toString();

  expect(spy).toHaveBeenCalled();
  expect(emailContent.includes('Reply-To: test@test1.com')).toBe(true);
  expect(response.id).toEqual('<mock-message-id@email.amazonses.com>');
});

test('should forward custom headers in raw email content', async () => {
  const mockResponse = { MessageId: 'mock-message-id' };
  const spy = vi.spyOn(SESv2Client.prototype, 'send').mockImplementation(async () => {
    return mockResponse as any;
  });

  const provider = new SESEmailProvider(mockConfig);
  await provider.sendMessage({
    ...mockNovuMessage,
    headers: {
      'In-Reply-To': '<original-message-id@example.com>',
      References: '<original-message-id@example.com>',
    },
  });

  const bufferArray = spy.mock.calls[0][0].input['Content']['Raw']['Data'];
  const emailContent = Buffer.from(bufferArray).toString();

  expect(spy).toHaveBeenCalled();
  expect(emailContent.includes('In-Reply-To: <original-message-id@example.com>')).toBe(true);
  expect(emailContent.includes('References: <original-message-id@example.com>')).toBe(true);
});

test('should forward custom MIME alternatives in raw email content', async () => {
  const mockResponse = { MessageId: 'mock-message-id' };
  const spy = vi.spyOn(SESv2Client.prototype, 'send').mockImplementation(async () => {
    return mockResponse as any;
  });

  const provider = new SESEmailProvider(mockConfig);
  await provider.sendMessage({
    ...mockNovuMessage,
    alternatives: [
      {
        contentType: 'text/vnd.google.email-reaction+json',
        content: JSON.stringify({ version: 1, emoji: '👀' }),
      },
    ],
  });

  const bufferArray = spy.mock.calls[0][0].input['Content']['Raw']['Data'];
  const emailContent = Buffer.from(bufferArray).toString();

  expect(spy).toHaveBeenCalled();
  expect(emailContent.includes('Content-Type: text/vnd.google.email-reaction+json')).toBe(true);
});

test('should trigger ses library correctly with _passthrough', async () => {
  const mockResponse = { MessageId: 'mock-message-id' };
  const spy = vi.spyOn(SESv2Client.prototype, 'send').mockImplementation(async () => {
    return mockResponse as any;
  });

  const provider = new SESEmailProvider(mockConfig);
  const response = await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        subject: 'test subject _passthrough',
      },
    },
  });

  const bufferArray = spy.mock.calls[0][0].input['Content']['Raw']['Data'];
  const buffer = Buffer.from(bufferArray);
  const emailContent = buffer.toString();

  expect(spy).toHaveBeenCalled();
  expect(emailContent.includes('Subject: test subject _passthrough')).toBe(true);
  expect(response.id).toEqual('<mock-message-id@email.amazonses.com>');
});

describe('getMessageId', () => {
  test('should return messageId when body is valid', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const messageId = provider.getMessageId(mockSESMessage);
    expect(messageId).toEqual([`<${mockSESMessage.mail.messageId}@${mockConfig.region}.amazonses.com>`]);
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
      row: JSON.stringify(mockSESMessage),
    });
  });

  test('should return undefined when event body is undefined', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const eventBody = provider.parseEventBody(undefined, 'test');
    expect(eventBody).toBeUndefined();
  });

  test('should return undefined when status is unrecognized', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const messageId = provider.parseEventBody({ event: 'not-real-event' }, 'test');
    expect(messageId).toBeUndefined();
  });
});

describe('Certificate URL Security Validation', () => {
  const createMockSnsMessage = (signingCertUrl: string) => ({
    Type: 'Notification',
    MessageId: 'test-message-id',
    TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic',
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1',
    Signature: 'mock-signature',
    SigningCertURL: signingCertUrl,
    Message: 'mock-message',
  });

  test('should accept valid AWS SNS certificate URLs', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const validUrls = [
      'https://sns.amazonaws.com/SimpleNotificationService-abc123.pem',
      'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc123.pem',
      'https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-def456.pem',
      'https://sns.ap-southeast-2.amazonaws.com/SimpleNotificationService-ghi789.pem',
      'https://sns.us-gov-west-1.amazonaws.com/SimpleNotificationService-jkl012.pem',
    ];

    for (const url of validUrls) {
      const result = await provider.verifySignature({
        rawBody: null,
        body: createMockSnsMessage(url),
        headers: { 'x-amz-sns-message-type': 'Notification' },
      });

      expect(result.success).toBe(false);
      expect(result.message).not.toContain('Invalid AWS certificate URL');
    }
  });

  test('should reject S3-hosted certificate URLs (the disclosed bypass)', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const s3Urls = [
      'https://s3.amazonaws.com/sns-certificates/SimpleNotificationService-abc123.pem',
      'https://s3.amazonaws.com/attacker-bucket/fake-cert.pem',
      'https://s3.amazonaws.com/any-bucket/SimpleNotificationService-xyz.pem',
    ];

    for (const url of s3Urls) {
      const result = await provider.verifySignature({
        rawBody: null,
        body: createMockSnsMessage(url),
        headers: { 'x-amz-sns-message-type': 'Notification' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid AWS certificate URL');
    }
  });

  test('should reject SNS hosts with non-canonical paths (path-pinning)', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const badPathUrls = [
      'https://sns.us-east-1.amazonaws.com/cert.pem',
      'https://sns.us-east-1.amazonaws.com/random.pem',
      'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc123.pem.evil',
      'https://sns.us-east-1.amazonaws.com/foo/SimpleNotificationService-abc.pem',
      'https://sns.amazonaws.com/SimpleNotificationService-abc.pem.txt',
    ];

    for (const url of badPathUrls) {
      const result = await provider.verifySignature({
        rawBody: null,
        body: createMockSnsMessage(url),
        headers: { 'x-amz-sns-message-type': 'Notification' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid AWS certificate URL');
    }
  });

  test('should reject malicious certificate URLs with subdomain injection', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const maliciousUrls = [
      'https://sns.evil.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.malicious-site.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.attacker.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.amazonaws.com.evil.com/SimpleNotificationService-abc.pem',
      'https://evil.sns.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://amazonaws.com.evil.com/SimpleNotificationService-abc.pem',
    ];

    for (const url of maliciousUrls) {
      const result = await provider.verifySignature({
        rawBody: null,
        body: createMockSnsMessage(url),
        headers: { 'x-amz-sns-message-type': 'Notification' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid AWS certificate URL');
    }
  });

  test('should reject non-HTTPS certificate URLs', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const insecureUrls = [
      'http://sns.amazonaws.com/SimpleNotificationService-abc.pem',
      'ftp://sns.amazonaws.com/SimpleNotificationService-abc.pem',
      'sns.amazonaws.com/SimpleNotificationService-abc.pem',
    ];

    for (const url of insecureUrls) {
      const result = await provider.verifySignature({
        rawBody: null,
        body: createMockSnsMessage(url),
        headers: { 'x-amz-sns-message-type': 'Notification' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid AWS certificate URL');
    }
  });

  test('should reject certificate URLs from non-AWS domains', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const nonAwsUrls = [
      'https://evil.com/sns.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://example.com/SimpleNotificationService-abc.pem',
      'https://sns.fake-aws.com/SimpleNotificationService-abc.pem',
      'https://amazonaws.evil.com/SimpleNotificationService-abc.pem',
    ];

    for (const url of nonAwsUrls) {
      const result = await provider.verifySignature({
        rawBody: null,
        body: createMockSnsMessage(url),
        headers: { 'x-amz-sns-message-type': 'Notification' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid AWS certificate URL');
    }
  });

  test('should validate regional SNS endpoints correctly', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const regionalUrls = [
      'https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.us-west-2.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.eu-central-1.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.ap-northeast-1.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.ca-central-1.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.us-gov-east-1.amazonaws.com/SimpleNotificationService-abc.pem',
    ];

    for (const url of regionalUrls) {
      const result = await provider.verifySignature({
        rawBody: null,
        body: createMockSnsMessage(url),
        headers: { 'x-amz-sns-message-type': 'Notification' },
      });

      expect(result.success).toBe(false);
      expect(result.message).not.toContain('Invalid AWS certificate URL');
    }
  });

  test('should reject invalid regional patterns', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const invalidRegionalUrls = [
      'https://sns.invalid-region.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.us-east-99.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.evil-central-1.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns..amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.us-.amazonaws.com/SimpleNotificationService-abc.pem',
      'https://sns.-east-1.amazonaws.com/SimpleNotificationService-abc.pem',
    ];

    for (const url of invalidRegionalUrls) {
      const result = await provider.verifySignature({
        rawBody: null,
        body: createMockSnsMessage(url),
        headers: { 'x-amz-sns-message-type': 'Notification' },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid AWS certificate URL');
    }
  });

  test('should accept SignatureVersion 2 (RSA-SHA256)', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const result = await provider.verifySignature({
      rawBody: null,
      body: {
        ...createMockSnsMessage('https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem'),
        SignatureVersion: '2',
      },
      headers: { 'x-amz-sns-message-type': 'Notification' },
    });

    // URL passed; rejection comes from the stubbed sns-validator, not from version check.
    expect(result.success).toBe(false);
    expect(result.message).not.toContain('Unsupported signature version');
    expect(result.message).not.toContain('Invalid AWS certificate URL');
  });

  test('should reject unsupported SignatureVersion values', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const result = await provider.verifySignature({
      rawBody: null,
      body: {
        ...createMockSnsMessage('https://sns.us-east-1.amazonaws.com/SimpleNotificationService-abc.pem'),
        SignatureVersion: '99',
      },
      headers: { 'x-amz-sns-message-type': 'Notification' },
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain('Unsupported signature version');
  });
});
