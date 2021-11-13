import { SendinblueEmailProvider } from './sendinblue.provider';

test('should trigger sendinblue library correctly', async () => {
  const provider = new SendinblueEmailProvider({
    apiKey: '<sendinblue-id>',
  });
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage({
    from: 'test@test.com',
    to: 'galezdel@gmail.com',
    html: '<div> Mail Content </div>',
    subject: 'Test subject',
    attachments: [{ mime: 'text/plain', file: Buffer.from('dGVzdA==') }],
  });

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith({
    from: 'test@test.com',
    to: 'test@test.com',
    html: '<div> Mail Content </div>',
    subject: 'Test subject',
    attachments: [{ mime: 'text/plain', file: Buffer.from('dGVzdA==') }],
  });
});
