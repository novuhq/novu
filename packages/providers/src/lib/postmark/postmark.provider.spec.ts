import { PostmarkEmailProvider } from './postmark.provider';

const mockConfig = {
  apiKey: '<postmark-id>',
  from: 'test@test.com',
};

const mockNovuMessage = {
  to: ['test2@test.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' },
  ],
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
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/dot-notation
    .spyOn(provider['client'], 'sendEmail')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
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

test('should get message ID', () => {
  const provider = new PostmarkEmailProvider(mockConfig);
  expect(provider.getMessageId(mockMessage)).toEqual([
    '883953f4-6105-42a2-a16a-77a8eac79483',
  ]);
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
  expect(
    Math.abs(currentDateTimestamp - new Date(date).getTime())
  ).toBeLessThanOrEqual(5000);

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
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/dot-notation
    .spyOn(provider['client'], 'sendEmail')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  const response = await provider.checkIntegration(mockNovuMessage);
  expect(spy).toHaveBeenCalled();
  expect(response.success).toBe(true);
});
