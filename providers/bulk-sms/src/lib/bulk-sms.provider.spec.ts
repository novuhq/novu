import { BulkSmsProvider } from './bulk-sms.provider';

const mockConfig = {
  apiToken: 'test-key',
};

const mockBulkSMSMessage = {
  to: '2348055372961',
  content: 'sms content',
  from: '45483533',
};

test('should trigger bulk-sms library correctly', async () => {
  const smsProvider = new BulkSmsProvider(mockConfig);
  const spy = jest
    .spyOn(smsProvider, 'sendMessage')
    .mockImplementation(async () => {
      return {
        id: '67890-90q8',
        date: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;
    });

  await smsProvider.sendMessage(mockBulkSMSMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    to: '2348055372961',
    content: 'sms content',
    from: '45483533',
  });
});
