import { MobishastraProvider } from './mobishastra.provider';
import crypto from 'crypto';

test('should trigger Mobishastra library correctly', async () => {
  const baseUrl = 'https://mshastra.com/sendsms_api_json.aspx';
  const senderName = 'sender-name';
  const testMobileNumber = '+123456789';
  const smsMessageContent = 'SMS Content form Mobishastra SMS Provider';
  const username = 'profile-username';
  const password = 'profile-password';

  const provider = new MobishastraProvider({
    baseUrl,
    from: senderName,
    username: username,
    password: password,
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
    to: testMobileNumber,
    from: senderName,
    content: smsMessageContent,
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: JSON.stringify([
      {
        Sender: senderName,
        number: testMobileNumber,
        msg: smsMessageContent,
        user: username,
        pwd: password,
      },
    ]),
  });
});
