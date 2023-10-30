// azure-sms.provider.spec.ts
import { AzureSmsProvider } from './azure-sms.provider';
import { SmsClient } from '@azure/communication-sms';

test('should trigger AzureSmsProvider library correctly', async () => {
  const provider = new AzureSmsProvider({
    connectionString: '<your-azure-connection-string>',
  });

  const mockSend = jest.fn();
  SmsClient.prototype.send = mockSend;
  mockSend.mockResolvedValue([
    {
      messageId: '12345-67a8',
      httpStatusCode: 202,
      successful: true,
      to: '+12345678902',
    },
  ]);

  await provider.sendMessage({
    from: '+1234567890',
    to: '+12345678902',
    content: 'Test message',
  });

  expect(mockSend).toHaveBeenCalled();

  expect(mockSend).toHaveBeenCalledWith({
    from: '+1234567890',
    to: '+12345678902',
    content: 'Test message',
  });
});
