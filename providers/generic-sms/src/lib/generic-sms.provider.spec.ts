import { GenericSmsProvider } from './generic-sms.provider';
import crypto from 'crypto';

test('should trigger generic-sms library correctly', async () => {
  const provider = new GenericSmsProvider({
    baseUrl: 'https://api.generic-sms-provider.com',
    apiKeyRequestHeader: 'apiKey',
    apiKey: '123456',
    from: 'sender-id',
    idPath: 'message.id',
    datePath: 'message.date',
  });

  const spy = jest
    .spyOn(provider.axiosInstance, 'request')
    .mockImplementation(async () => {
      return {
        data: {
          message: {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
          },
        },
      } as any;
    });

  await provider.sendMessage({
    to: '+1234567890',
    content: 'SMS Content form Generic SMS Provider',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: {
      to: '+1234567890',
      content: 'SMS Content form Generic SMS Provider',
      sender: 'sender-id',
    },
  });
});
