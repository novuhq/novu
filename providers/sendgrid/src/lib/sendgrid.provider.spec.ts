import sendgridMail, { MailService } from '@sendgrid/mail';
import { SendgridEmailProvider } from './sendgrid.provider';

const mockConfig = {
  apiKey: 'SG.1234',
  from: 'test@tet.com',
  senderName: 'test',
};

const mockNovuMessage = {
  to: 'test@test2.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  from: 'test@tet.com',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
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
    to: mockNovuMessage.to,
    subject: mockNovuMessage.subject,
    html: mockNovuMessage.html,
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
      id: undefined,
    },
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
