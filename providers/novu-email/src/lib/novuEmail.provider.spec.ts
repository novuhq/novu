import { NovuEmailProvider } from './novuEmail.provider';
import { SendgridEmailProvider } from '@novu/sendgrid';

const mockConfig = {
  apiKey: 'SG.1234',
  from: 'testfromconfig@tet.com',
  senderName: 'test',
};

const mockNovuMessage = {
  to: 'test@test2.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  from: 'frommessage@tet.com',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
};

const { from, ...mockNovuMessageFromDropped } = mockNovuMessage;

test('should trigger novuEmail correctly by dropping from address', async () => {
  const provider = new NovuEmailProvider(mockConfig);
  const spy = jest
    .spyOn(SendgridEmailProvider.prototype, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(mockNovuMessageFromDropped);
});

test('should check provider integration correctly', async () => {
  const provider = new NovuEmailProvider(mockConfig);
  const response = await provider.checkIntegration(mockNovuMessage);
  console.log('response', response);
  expect(response.success).toBe(true);
});
