import { EazySmsProvider } from './eazy-sms.provider';

const mockConfig = {
  apiKey: 'test-key',
  channelId: 'test-key@sms.eazy.im',
};

const mockSMSMessage = {
  to: '1234567890',
  content: 'sms content',
};

test('should trigger eazy-sms library correctly', async () => {
  const smsProvider = new EazySmsProvider(mockConfig);
  const spy = jest
    .spyOn(smsProvider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: '2574a339-86ff',
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await smsProvider.sendMessage(mockSMSMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    content: 'sms content',
    to: '1234567890',
  });
});
