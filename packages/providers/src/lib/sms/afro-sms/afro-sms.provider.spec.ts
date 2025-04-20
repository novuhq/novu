import axios from 'axios';
import { AfroSmsProvider } from './afro-sms.provider';

jest.mock('axios');

describe('AfroSmsProvider', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    senderName: 'test-sender',
  };

  const mockNovuMessage = {
    to: '1234567890',
    content: 'Test message',
  };

  it('should trigger afro-sms library correctly', async () => {
    const mockResponse = {
      data: {
        acknowledge: 'success',
        response: {
          message_id: '123456',
        },
      },
    };

    (axios.get as jest.Mock).mockResolvedValue(mockResponse);

    const provider = new AfroSmsProvider(mockConfig);
    const spy = jest.spyOn(axios, 'get');

    await provider.sendMessage(mockNovuMessage);

    expect(spy).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith('https://api.afromessage.com/api/send', {
      params: {
        api_key: mockConfig.apiKey,
        sender: mockConfig.senderName,
        to: mockNovuMessage.to,
        message: mockNovuMessage.content,
      },
    });
  });

  it('should handle error responses correctly', async () => {
    const mockErrorResponse = {
      data: {
        acknowledge: 'error',
        response: 'Invalid API key',
      },
    };

    (axios.get as jest.Mock).mockResolvedValue(mockErrorResponse);

    const provider = new AfroSmsProvider(mockConfig);

    await expect(provider.sendMessage(mockNovuMessage)).rejects.toThrow('AfroSMS error: Invalid API key');
  });
});
