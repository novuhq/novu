import sendgridMail from '@sendgrid/mail';
import { SendgridEmailProvider } from './sendgrid.provider';

const mocKconfig = {
  apiKey: 'SG.1234',
  from: 'test@tet.com',
};

const mockNotifireMessage = {
  to: 'test@test2.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  from: 'test@tet.com',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
};
test('should trigger sendgrid correctly', async () => {
  const provider = new SendgridEmailProvider(mocKconfig);
  const spy = jest.spyOn(sendgridMail, 'send').mockImplementation(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return {} as any;
  });
  await provider.sendMessage(mockNotifireMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: mockNotifireMessage.to,
    subject: mockNotifireMessage.subject,
    html: mockNotifireMessage.html,
    from: mockNotifireMessage.from,
    substitutions: {},
    attachments: [
      {
        type: 'text/plain',
        content: Buffer.from('dGVzdA==').toString(),
        filename: 'test.txt',
      },
    ],
  });
});
