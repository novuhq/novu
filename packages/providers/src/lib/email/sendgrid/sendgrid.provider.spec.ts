import sendgridMail, { MailService } from '@sendgrid/mail';
import { SendgridEmailProvider } from './sendgrid.provider';

const mockConfig = {
  apiKey: 'SG.1234',
  from: 'test@tet.com',
  senderName: 'test',
};

const mockNovuMessage = {
  to: ['test@test2.com'],
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  from: 'test@tet.com',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
  id: 'message_id',
};

test('should trigger sendgrid correctly', async () => {
  const provider = new SendgridEmailProvider(mockConfig);
  const spy = jest
    .spyOn(MailService.prototype, 'send')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: [
      {
        email: mockNovuMessage.to[0],
      },
    ],
    bcc: undefined,
    category: undefined,
    cc: undefined,
    subject: mockNovuMessage.subject,
    html: mockNovuMessage.html,
    ipPoolName: undefined,
    from: { email: mockNovuMessage.from, name: mockConfig.senderName },
    substitutions: {},
    attachments: [
      {
        type: 'text/plain',
        content: Buffer.from('ZEdWemRBPT0=').toString(),
        filename: 'test.txt',
      },
    ],
    customArgs: {
      id: 'message_id',
      novuMessageId: 'message_id',
      novuSubscriberId: undefined,
      novuTransactionId: undefined,
      novuWorkflowIdentifier: undefined,
    },
    personalizations: [
      {
        to: [
          {
            email: mockNovuMessage.to[0],
          },
        ],
        cc: undefined,
        bcc: undefined,
        dynamicTemplateData: undefined,
      },
    ],
    templateId: undefined,
  });
});

test('should check provider integration correctly', async () => {
  const provider = new SendgridEmailProvider(mockConfig);
  const spy = jest
    .spyOn(MailService.prototype, 'send')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [{ statusCode: 202 }] as any;
    });

  const response = await provider.checkIntegration(mockNovuMessage);
  expect(spy).toHaveBeenCalled();
  expect(response.success).toBe(true);
});

test('should get ip pool name from credentials', async () => {
  const provider = new SendgridEmailProvider({
    ...mockConfig,
    ...{ ipPoolName: 'config_ip' },
  });
  const sendMock = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
  jest.spyOn(MailService.prototype, 'send').mockImplementation(sendMock);

  await provider.sendMessage({
    ...mockNovuMessage,
  });
  expect(sendMock).toHaveBeenCalledWith(
    expect.objectContaining({ ipPoolName: 'config_ip' })
  );
});

test('should override credentials with mail data', async () => {
  const provider = new SendgridEmailProvider({
    ...mockConfig,
    ...{ ipPoolName: 'config_ip' },
  });
  const sendMock = jest.fn().mockResolvedValue([{ statusCode: 202 }]);
  jest.spyOn(MailService.prototype, 'send').mockImplementation(sendMock);

  await provider.sendMessage({
    ...mockNovuMessage,
    ...{ ipPoolName: 'ip_from_mail_data' },
  });
  expect(sendMock).toHaveBeenCalledWith(
    expect.objectContaining({ ipPoolName: 'ip_from_mail_data' })
  );
});
