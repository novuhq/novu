import { BulkSmsSmsProvider, SmsParams } from './bulk-sms.provider';

test('should trigger bulk-sms library correctly', async () => {
  const provider = new BulkSmsSmsProvider({
    username: 'your_mail',
    password: 'your_password',
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
    to: '+91789456123',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: '+91789456123',
    content: 'Your otp code is 32901',
  } as Partial<SmsParams>);
});
