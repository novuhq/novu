import { ISendSmsProvider } from './isend-sms.provider';

const mockConfig = {
  apiToken: 'test-key',
};

const mockBulkSMSMessage = {
  to: '2348055372961',
  content: 'sms content',
  from: '45483533',
};

test('should trigger isend-sms library correctly', async () => {
  const smsProvider = new ISendSmsProvider(mockConfig);
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
