import { PostmarkEmailProvider } from './postmark.provider';

test('should trigger postmark correctly', async () => {
  const provider = new PostmarkEmailProvider({
    apiKey: '<postmark-id>',
    from: 'test@test.com',
  });
  const spy = jest
    // eslint-disable-next-line @typescript-eslint/dot-notation
    .spyOn(provider['client'], 'sendEmail')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });
  await provider.sendMessage({
    to: 'test2@test.com',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
    attachments: [
      { mime: 'text/plain', file: Buffer.from('dGVzdA=='), name: 'test.txt' },
    ],
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    From: 'test@test.com',
    To: 'test2@test.com',
    HtmlBody: '<div> Mail Content </div>',
    TextBody: '<div> Mail Content </div>',
    Subject: 'test subject',
    Attachments: [
      {
        Name: 'test.txt',
        Content: 'dGVzdA==',
        ContentID: null,
        ContentType: 'text/plain',
      },
    ],
  });
});
