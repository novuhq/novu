import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RuachSmsProvider } from './ruach-sms.provider';

vi.mock('axios');

describe('RuachSmsProvider', () => {
  const mockConfig = {
    apiKey: 'test-api-key',
    clientId: 'test-client-id',
    from: 'Novu',
  };

  const mockSuccessResponse = {
    data: {
      ErrorCode: 0,
      ErrorDescription: 'Success',
      Data: [
        {
          MobileNumber: '2341234567890',
          MessageId: '3bb944ad-d943-419f-83dc-f979002a8c0b',
        },
      ],
    },
  };

  let provider: RuachSmsProvider;

  beforeEach(() => {
    provider = new RuachSmsProvider(mockConfig);
    vi.clearAllMocks();
  });

  it('should send an SMS message successfully', async () => {
    vi.mocked(axios.post).mockResolvedValue(mockSuccessResponse);

    const result = await provider.sendMessage({
      to: '2341234567890',
      content: 'Hello from Ruach SMS API!',
    });

    expect(axios.post).toHaveBeenCalledWith(
      'https://app.notify.ng/api/v2/SendSMS',
      expect.objectContaining({
        SenderId: 'Novu',
        Message: 'Hello from Ruach SMS API!',
        MobileNumbers: '2341234567890',
        ApiKey: 'test-api-key',
        ClientId: 'test-client-id',
        Is_Unicode: false,
        Is_Flash: false,
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    );

    expect(result).toEqual({
      id: '3bb944ad-d943-419f-83dc-f979002a8c0b',
      date: expect.any(String),
    });
  });

  it('should treat a string "0" ErrorCode as success', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        ErrorCode: '0',
        ErrorDescription: 'Success',
        Data: [{ MobileNumber: '2341234567890', MessageId: 'string-code-id' }],
      },
    });

    const result = await provider.sendMessage({
      to: '2341234567890',
      content: 'Hello',
    });

    expect(result.id).toEqual('string-code-id');
  });

  it('should strip the leading "+" from E.164 phone numbers', async () => {
    vi.mocked(axios.post).mockResolvedValue(mockSuccessResponse);

    await provider.sendMessage({
      to: '+2341234567890',
      content: 'Hello',
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ MobileNumbers: '2341234567890' }),
      expect.any(Object)
    );
  });

  it('should use the from field passed in the options over the config', async () => {
    vi.mocked(axios.post).mockResolvedValue(mockSuccessResponse);

    await provider.sendMessage({
      to: '2341234567890',
      content: 'Hello',
      from: 'CustomSender',
    });

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ SenderId: 'CustomSender' }),
      expect.any(Object)
    );
  });

  it('should throw an error when the API returns a non-zero ErrorCode', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: { ErrorCode: 3, ErrorDescription: 'SenderId cannot be blank' },
    });

    await expect(provider.sendMessage({ to: '2341234567890', content: 'Hello' })).rejects.toThrow(
      'SenderId cannot be blank'
    );
  });
});
