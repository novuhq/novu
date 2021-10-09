import { PostmarkEmailProvider } from './postmark.provider';

test('should trigger postmark correctly', async () => {
  const provider = new PostmarkEmailProvider({
    apiKey: '0d5d3d8c-53d6-4006-b9e2-d8f72822c852',
    from: 'tomer@notifire.co',
  });
  const spy = jest
    .spyOn(provider['client'], 'sendEmail')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });
  await provider.sendMessage({
    to: 'tomer@notifire.co',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    From: 'tomer@notifire.co',
    To: 'tomer@notifire.co',
    HtmlBody: '<div> Mail Content </div>',
    TextBody: '<div> Mail Content </div>',
    Subject: 'test subject',
  });
});
