import { SendinblueEmailProvider } from './sendinblue.provider';
import { EmailEventStatusEnum } from '@novu/stateless';
import { TransactionalEmailsApi, SendSmtpEmail } from '@sendinblue/client';

const mockConfig = {
  apiKey:
    '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',
  from: 'test@novu.co',
  senderName: 'test',
};

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
};

const mockSendinblueMessage = {
  event: 'delivered',
  email: 'test@test.com',
  id: 26224,
  date: '2022-10-11 14:13:07',
  ts: 1598634509,
  'message-id': '<xxxxxxxxxxxx.xxxxxxxxx@domain.com>',
  ts_event: 1598034509,
  subject: 'Subject Line',
  tag: '["transactionalTag"]',
  sending_ip: '185.41.28.109',
  ts_epoch: 1598634509223,
  tags: ['test'],
};

test('should trigger sendinblue library correctly', async () => {
  const provider = new SendinblueEmailProvider(mockConfig);
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith({
    from: mockNovuMessage.from,
    to: mockNovuMessage.to,
    html: mockNovuMessage.html,
    subject: mockNovuMessage.subject,
    attachments: [
      {
        mime: mockNovuMessage.attachments[0].mime,
        file: mockNovuMessage.attachments[0].file,
        name: mockNovuMessage.attachments[0].name,
      },
    ],
  });
});

test('should correctly use sender email and name from the config', async () => {
  const emailsApi = new TransactionalEmailsApi('/test');
  const sendTransacEmailMock = jest.fn(
    async (_sendSmtpEmail, _options?) => ({})
  );
  emailsApi.sendTransacEmail = sendTransacEmailMock as any;
  const provider = new SendinblueEmailProvider(mockConfig);
  // eslint-disable-next-line @typescript-eslint/dot-notation
  provider['transactionalEmailsApi'] = emailsApi;
  const { from, ...mockNovuMessageWithoutFrom } = mockNovuMessage;

  // use config.from if message.from is not provided
  await provider.sendMessage(mockNovuMessageWithoutFrom);
  expect(sendTransacEmailMock).toBeCalledTimes(1);
  expect(sendTransacEmailMock.mock.calls[0][0]).toBeInstanceOf(SendSmtpEmail);
  const smtpEmail = sendTransacEmailMock.mock.calls[0][0] as SendSmtpEmail;
  expect(smtpEmail.sender.email).toBe(mockConfig.from);

  // sendinblue sender.name should be set from config
  expect(smtpEmail.sender.name).toBe(mockConfig.senderName);

  // Use the message.from instead of config.from if available
  await provider.sendMessage(mockNovuMessage);
  expect(sendTransacEmailMock).toBeCalledTimes(2);
  const smtpEmailWithFrom = sendTransacEmailMock.mock
    .calls[1][0] as SendSmtpEmail;
  expect(smtpEmailWithFrom.sender.email).toBe(mockNovuMessage.from);
});

describe('getMessageId', () => {
  test('should return messageId when body is valid', async () => {
    const provider = new SendinblueEmailProvider(mockConfig);
    const messageId = provider.getMessageId(mockSendinblueMessage);
    expect(messageId).toEqual([mockSendinblueMessage['message-id']]);
  });

  test('should return messageId when body is array', async () => {
    const provider = new SendinblueEmailProvider(mockConfig);
    const messageId = provider.getMessageId([mockSendinblueMessage]);
    expect(messageId).toEqual([mockSendinblueMessage['message-id']]);
  });

  test('should return undefined when event body is undefined', async () => {
    const provider = new SendinblueEmailProvider(mockConfig);
    const messageId = provider.parseEventBody(undefined, 'test');
    expect(messageId).toBeUndefined();
  });

  test('should return undefined when event body is empty', async () => {
    const provider = new SendinblueEmailProvider(mockConfig);
    const messageId = provider.parseEventBody([], 'test');
    expect(messageId).toBeUndefined();
  });
});

describe('parseEventBody', () => {
  test('should return IEmailEventBody object when body is valid', async () => {
    const provider = new SendinblueEmailProvider(mockConfig);
    const eventBody = provider.parseEventBody(mockSendinblueMessage, 'test');
    const dateISO = new Date(mockSendinblueMessage.date).toISOString();
    expect(eventBody).toEqual({
      status: EmailEventStatusEnum.DELIVERED,
      date: dateISO,
      externalId: mockSendinblueMessage.id,
      attempts: undefined,
      response: undefined,
      row: mockSendinblueMessage,
    });
  });

  test('should return undefined when event body is undefined', async () => {
    const provider = new SendinblueEmailProvider(mockConfig);
    const eventBody = provider.parseEventBody(undefined, 'test');
    expect(eventBody).toBeUndefined();
  });

  test('should return undefined when status is unrecognized', async () => {
    const provider = new SendinblueEmailProvider(mockConfig);
    const messageId = provider.parseEventBody(
      { event: 'not-real-event' },
      'test'
    );
    expect(messageId).toBeUndefined();
  });
});
