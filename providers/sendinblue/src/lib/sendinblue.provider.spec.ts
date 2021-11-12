import { SendinblueEmailProvider } from './sendinblue.provider';

test('should trigger sendinblue library correctly', async () => {
  const provider = new SendinblueEmailProvider({
    apiKey:
      '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',
  });
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage({
    from: 'test@test.com',
    to: 'test@test.com',
    html: '<div> Mail Content </div>',
    subject: 'Test subject',
  });

  expect(spy).toBeCalled();
  expect(spy).toBeCalledWith({
    from: 'test@test.com',
    to: 'test@test.com',
    html: '<div> Mail Content </div>',
    subject: 'Test subject',
  });
});
