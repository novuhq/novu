import { SmsToSmsProvider } from './sms-to.provider';

const mockConfig = {
  apiKey: '<test-api-key>',
  from: 'novu',
};

const mockMessage = {
  to: '+35799999999999',
  content: 'This is test',
};

test('should trigger sms-to library correctly', async () => {
  const smsProvider = new SmsToSmsProvider(mockConfig);

  const spy = jest
    .spyOn(smsProvider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: '11ec-832f-a6f3fcfe-9fea-02420a0002ab',
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await smsProvider.sendMessage(mockMessage);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith({
    to: '+35799999999999',
    content: 'This is test',
  });
});
