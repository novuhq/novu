import { PostmarkEmailProvider } from './postmark.provider';

test('should trigger postmark correctly', async () => {
  const provider = new PostmarkEmailProvider({
    apiKey: '<postmark-id>',
    from: 'test@test.com',
  });
  const spy = jest
    .spyOn(provider['client'], 'sendEmail')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });
  await provider.sendMessage({
    to: 'test2@test.com',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    From: 'test@test.com',
    To: 'test2@test.com',
    HtmlBody: '<div> Mail Content </div>',
    TextBody: '<div> Mail Content </div>',
    Subject: 'test subject',
  });
});
