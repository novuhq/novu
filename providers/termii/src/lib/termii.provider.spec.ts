import { TermiiSmsProvider, SmsParams } from './termii.provider';

test('should trigger termii library correctly', async () => {
  const provider = new TermiiSmsProvider({
    apiKey: 'SG.',
    from: 'TermiiTest',
  });

  const spy = jest
    .spyOn(provider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        date: new Date().toISOString(),
        id: Math.ceil(Math.random() * 100),
      } as any;
    });

  await provider.sendMessage({
    content: 'Your otp code is 32901',
    from: 'TermiiTest',
    to: '+2347063317344',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: '+2347063317344',
    from: 'TermiiTest',
    content: 'Your otp code is 32901',
  } as Partial<SmsParams>);
});
