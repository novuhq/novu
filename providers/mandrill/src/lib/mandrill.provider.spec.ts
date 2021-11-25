import { MandrillProvider } from './mandrill.provider';

test('should trigger mandrill correctly', async () => {
  const provider = new MandrillProvider({
    apiKey: 'API_KEY',
    from: 'test@test.com',
  });
  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return {} as any;
    });

  await provider.sendMessage({
    to: 'test2@test.com',
    subject: 'test subject',
    html: '<div> Mail Content </div>',
    attachments: [
      { mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' },
    ],
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: 'test2@test.com',
    html: '<div> Mail Content </div>',
    subject: 'test subject',
    attachments: [
      { mime: 'text/plain', file: Buffer.from('test'), name: 'test.txt' },
    ],
  });
});
