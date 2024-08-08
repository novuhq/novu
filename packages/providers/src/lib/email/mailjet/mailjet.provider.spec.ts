import { expect, test, vi } from 'vitest';
import { MailjetEmailProvider } from './mailjet.provider';

const response = {
  response: {
    headers: {
      'content-length': '287',
      'content-type': 'application/json; charset=UTF-8',
      'x-mj-request-guid': 'a9e7-437c-84f8-e2c2d5958014',
      date: 'Sun, 24 Oct 2021 15:56:29 GMT',
      connection: 'close',
    },
    status: 200,
  },
  body: {
    Messages: [
      {
        Status: 'success',
        To: [
          {
            Email: 'testTo@test2.com',
            MessageUUID: 'a6da-4b1b-ad92-066cfb314d66',
            MessageID: '5764607616719',
            MessageHref:
              'https://api.mailjet.com/v3/REST/message/5764607616719',
          },
        ],
        Cc: [],
        Bcc: [],
      },
    ],
  },
};

const requestFn = vi.fn().mockResolvedValue(response);

vi.mock(import('node-mailjet'), async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    Client: vi.fn().mockImplementation(() => {
      return {
        post: vi.fn().mockImplementation(() => {
          return {
            request: requestFn,
          };
        }),
      };
    }),
  };
});

const mockConfig = {
  apiKey: 'testApiKey',
  apiSecret: 'testSecret',
  from: 'testFrom@test.com',
  senderName: 'testSender',
};
const mockMessageConfig = {
  to: ['testTo@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
};

test('should trigger mailjet library correctly and return proper response', async () => {
  const provider = new MailjetEmailProvider(mockConfig);

  const messageResponse = await provider.sendMessage(mockMessageConfig, {
    textPart: 'test',
  });

  expect(requestFn).toBeCalledTimes(1);
  expect(requestFn).toBeCalledWith({
    Messages: [
      {
        From: { Email: mockConfig.from, Name: mockConfig.senderName },
        HTMLPart: mockMessageConfig.html,
        Subject: mockMessageConfig.subject,
        TextPart: 'test',
        To: [{ Email: mockMessageConfig.to[0] }],
      },
    ],
  });
  expect(messageResponse.id).toBe('a9e7-437c-84f8-e2c2d5958014');
  expect(messageResponse.date).toBeDefined();
});

test('should trigger mailjet library correctly and return proper response with _passthrough', async () => {
  const provider = new MailjetEmailProvider(mockConfig);

  const messageResponse = await provider.sendMessage(mockMessageConfig, {
    textPart: 'test',
    _passthrough: {
      body: {
        HiHello: 'test',
      },
    },
  });

  expect(requestFn).toBeCalledWith({
    Messages: [
      {
        From: { Email: mockConfig.from, Name: mockConfig.senderName },
        HTMLPart: mockMessageConfig.html,
        Subject: mockMessageConfig.subject,
        TextPart: 'test',
        HiHello: 'test',
        To: [{ Email: mockMessageConfig.to[0] }],
      },
    ],
  });
  expect(messageResponse.id).toBe('a9e7-437c-84f8-e2c2d5958014');
  expect(messageResponse.date).toBeDefined();
});

test('should check provider integration correctly', async () => {
  const provider = new MailjetEmailProvider(mockConfig);
  const messageResponse = await provider.checkIntegration(mockMessageConfig);

  expect(requestFn).toHaveBeenCalled();
  expect(messageResponse.success).toBe(true);
});
