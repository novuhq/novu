import { PostmarkEmailProvider } from './postmark.provider';

const mockConfig = {
  apiKey: '<postmark-id>',
  from: 'test@test.com',
};

const mockNovuMessage = {
  to: 'test2@test.com',
  subject: 'test subject',
  html: '<div> Mail Content </div>',
  attachments: [
    { mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' },
  ],
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
    To: mockNovuMessage.to,
    HtmlBody: mockNovuMessage.html,
    TextBody: mockNovuMessage.html,
    Subject: mockNovuMessage.subject,
    Attachments: [
      {
        Name: 'test.txt',
        Content: 'test',
        ContentID: null,
        ContentType: 'text/plain',
      },
    ],
  });
});
