import { ClicksendSmsProvider } from './clicksend.provider';

const mockConfig = {
  apiKey: '51A8AAF4-88C1-4391-53EC-BFB711CF7AF0',
  username: 'test-username',
  from: 'clicksend',
};

const mockNovuMessage = {
  to: '+61411111111',
  content: 'sms content',
};

test('should trigger clicksend library correctly', async () => {
  const smsProvider = new ClicksendSmsProvider(mockConfig);

  const spy = jest
    .spyOn(smsProvider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: 'BF7AD270-0DE2-418B-B606-71D527D9C1AE',
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await smsProvider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith({
    to: '+61411111111',
    content: 'sms content',
  });
});
