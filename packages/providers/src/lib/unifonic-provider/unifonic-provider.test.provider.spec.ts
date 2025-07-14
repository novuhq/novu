import axios from 'axios';
import { UnifonicSmsProvider } from './unifonic-provider.provider';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('UnifonicSmsProvider', () => {
  test('should trigger Unifonic SMS API correctly', async () => {
    const provider = new UnifonicSmsProvider({
      appSid: '2W950KLy4G0Ljq7S0GKNbRoBtgKr1T',
      senderId: 'EjariSMS',
    });

    mockedAxios.post.mockResolvedValue({
      data: {
        messageID: '123456789',
      },
    });

    await provider.sendMessage({
      to: '966123456789',
      content: 'Hi there',
    });

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://el.cloud.unifonic.com/rest/SMS/messages',
      expect.stringContaining('AppSid=2W950KLy4G0Ljq7S0GKNbRoBtgKr1T'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    );
  });

  test('should throw error if messageID is missing', async () => {
    const provider = new UnifonicSmsProvider({
      appSid: 'dummy',
      senderId: 'dummy',
    });

    mockedAxios.post.mockResolvedValue({
      data: {},
    });

    await expect(
      provider.sendMessage({
        to: '966123456789',
        content: 'Test',
      })
    ).rejects.toThrow('Unifonic SMS failed');
  });
});
