import { MandrillProvider } from './mandrill.provider';

test('should trigger mandrill correctly', async () => {
  const provider = new MandrillProvider({
    apiKey: '<mandrill-apiKey>',
    from: 'test@test.com',
  });
  const spy = jest
    .spyOn(MandrillProvider, 'sendMessage')
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
    from: 'test@test.com',
    to: 'test2@test.com',
    html: '<div> Mail Content </div>',
    subject: 'test subject'
  });
});
