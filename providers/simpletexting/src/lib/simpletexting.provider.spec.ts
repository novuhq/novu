import { SimpletextingSmsProvider } from './simpletexting.provider';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

test('should trigger SimpletextingSmsProvider library correctly', async () => {
  const provider = new SimpletextingSmsProvider({
    apiKey: '<YOUR_SIMPLETEXTING_APIKEY>',
    accountPhone: '<SENDER_PHONE>',
  });

  mockedAxios.post.mockResolvedValue({
    data: {
      id: '12345-67a8',
    },
  });

  const response = await provider.sendMessage({
    to: '+12345678902',
    content: 'test message',
  });

  expect(mockedAxios.post).toHaveBeenCalled();

  expect(mockedAxios.post).toHaveBeenCalledWith(
    'https://api-app2.simpletexting.com/v2/api/messages',
    {
      contactPhone: '+12345678902',
      accountPhone: '<SENDER_PHONE>',
      mode: 'SINGLE_SMS_STRICTLY',
      text: 'test message',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer <YOUR_SIMPLETEXTING_APIKEY>`,
      },
    }
  );

  expect(response).toHaveProperty('id');
});
