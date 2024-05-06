// azure-sms.provider.spec.ts
import { AzureSmsProvider } from './azure-sms.provider';
import { SmsClient } from '@azure/communication-sms';

jest.mock('@azure/communication-sms');
test('should trigger AzureSmsProvider library correctly', async () => {
  const mockSend = jest.fn().mockResolvedValue([
    {
      messageId: '12345-67a8',
      httpStatusCode: 202,
      successful: true,
      to: '+12345678902',
    },
  ]);

  (SmsClient as jest.MockedClass<typeof SmsClient>).mockImplementation(() => {
    return {
      send: mockSend,
    } as unknown as SmsClient;
  });

  const provider = new AzureSmsProvider({
    connectionString: 'MOCK-CONNECTION-STRING',
  });

  await provider.sendMessage({
    from: '+1234567890',
    to: '+12345678902',
    content: 'Test message',
  });

  expect(mockSend).toHaveBeenCalled();

  expect(mockSend).toHaveBeenCalledWith({
    from: '+1234567890',
    to: ['+12345678902'],
    message: 'Test message',
  });
});
