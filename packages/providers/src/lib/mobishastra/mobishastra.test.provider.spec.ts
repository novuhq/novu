import { MobishastraProvider } from './mobishastra.provider';
import crypto from 'crypto';

test('should trigger Mobishastra library correctly', async () => {
  const provider = new MobishastraProvider({
    baseUrl: 'https://mshastra.com/sendsms_api_json.aspx',
    from: 'sender-name',
    username: 'profile-username',
    password: 'profile-password',
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
    to: '+123456789',
    from: 'sender-name',
    content: 'SMS Content form Mobishastra SMS Provider',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: JSON.stringify([
      {
        Sender: 'sender-name',
        number: '+123456789',
        msg: 'SMS Content form Mobishastra SMS Provider',
        user: 'profile-username',
        pwd: 'profile-password',
      },
    ]),
  });
});
