import { SparkPostEmailProvider } from './sparkpost.provider';

const mockConfig = {
  apiKey:
    'mock-api-key123',
  eu: false,
  from: 'test@test.com',
  senderName: 'test',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}as any;

const mockNovuMessage = {
  from: 'test@test.com',
  to: ['test@test.com'],
  html: '<div> Mail Content </div>',
  subject: 'Test subject',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
  ],
};

test('should trigger sendinblue library correctly', async () => {
  const provider = new SparkPostEmailProvider(mockConfig);
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
