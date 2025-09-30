import { SESClient } from '@aws-sdk/client-ses';
import { EmailEventStatusEnum } from '@novu/stateless';
import { describe, expect, test, vi } from 'vitest';
import { SESEmailProvider } from './ses.provider';

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
  const spy = vi.spyOn(SESClient.prototype, 'send').mockImplementation(async () => {
    return mockResponse as any;
  });

  const provider = new SESEmailProvider(mockConfig);
  const response = await provider.sendMessage(mockNovuMessage);

  const bufferArray = spy.mock.calls[0][0].input['RawMessage']['Data'];
  const buffer = Buffer.from(bufferArray);
  const emailContent = buffer.toString();

  expect(spy).toHaveBeenCalled();
  expect(emailContent.includes('Reply-To: test@test1.com')).toBe(true);
  expect(response.id).toEqual('<mock-message-id@email.amazonses.com>');
});

test('should trigger ses library correctly with _passthrough', async () => {
  const mockResponse = { MessageId: 'mock-message-id' };
  const spy = vi.spyOn(SESClient.prototype, 'send').mockImplementation(async () => {
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

  const bufferArray = spy.mock.calls[0][0].input['RawMessage']['Data'];
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
    // Mock fetch to prevent actual HTTP requests
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'mock-certificate',
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new SESEmailProvider(mockConfig);
    const validUrls = [
      'https://sns.amazonaws.com/SimpleNotificationService.pem',
      'https://sns.us-east-1.amazonaws.com/cert.pem',
      'https://sns.eu-west-1.amazonaws.com/cert.pem',
      'https://sns.ap-southeast-2.amazonaws.com/cert.pem',
      'https://sns.us-gov-west-1.amazonaws.com/cert.pem',
      'https://s3.amazonaws.com/sns-certificates/cert.pem',
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

    vi.unstubAllGlobals();
  });

  test('should reject malicious certificate URLs with subdomain injection', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const maliciousUrls = [
      'https://sns.evil.amazonaws.com/cert.pem', // Subdomain injection
      'https://sns.malicious-site.amazonaws.com/cert.pem', // Subdomain injection
      'https://sns.attacker.amazonaws.com/cert.pem', // Subdomain injection
      'https://sns.amazonaws.com.evil.com/cert.pem', // Domain spoofing
      'https://evil.sns.amazonaws.com/cert.pem', // Prefix injection
      'https://amazonaws.com.evil.com/cert.pem', // Domain spoofing
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
      'http://sns.amazonaws.com/cert.pem',
      'ftp://sns.amazonaws.com/cert.pem',
      'sns.amazonaws.com/cert.pem',
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
      'https://evil.com/sns.amazonaws.com/cert.pem',
      'https://example.com/cert.pem',
      'https://sns.fake-aws.com/cert.pem',
      'https://amazonaws.evil.com/cert.pem',
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
    // Mock fetch to prevent actual HTTP requests
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'mock-certificate',
    });
    vi.stubGlobal('fetch', mockFetch);

    const provider = new SESEmailProvider(mockConfig);
    const regionalUrls = [
      'https://sns.us-east-1.amazonaws.com/cert.pem',
      'https://sns.us-west-2.amazonaws.com/cert.pem',
      'https://sns.eu-central-1.amazonaws.com/cert.pem',
      'https://sns.ap-northeast-1.amazonaws.com/cert.pem',
      'https://sns.ca-central-1.amazonaws.com/cert.pem',
      'https://sns.us-gov-east-1.amazonaws.com/cert.pem',
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

    vi.unstubAllGlobals();
  });

  test('should reject invalid regional patterns', async () => {
    const provider = new SESEmailProvider(mockConfig);
    const invalidRegionalUrls = [
      'https://sns.invalid-region.amazonaws.com/cert.pem',
      'https://sns.us-east-99.amazonaws.com/cert.pem',
      'https://sns.evil-central-1.amazonaws.com/cert.pem',
      'https://sns..amazonaws.com/cert.pem',
      'https://sns.us-.amazonaws.com/cert.pem',
      'https://sns.-east-1.amazonaws.com/cert.pem',
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
});
