import { ChannelEndpointByType, ENDPOINT_TYPES, IChatOptions } from '@novu/stateless';
import { nanoid } from 'nanoid';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { SendblueChatProvider } from './sendblue.provider';

const mockProviderConfig = {
  apiKey: 'my-api-key',
  secretKey: 'my-secret-key',
  from: '+19998887777',
};

const buildResponse = (messageHandle: string, overrides: Record<string, unknown> = {}) => {
  return {
    data: {
      message_handle: messageHandle,
      date_created: '2023-10-01T12:00:00Z',
      status: 'QUEUED',
      ...overrides,
    },
  };
};

test('should trigger sendblue library correctly with a simple text message', async () => {
  const messageHandle = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageHandle));

  const provider = new SendblueChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Simple text message',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(), {
    number: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    from_number: mockProviderConfig.from,
    content: options.content,
  });

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.apiKey, mockProviderConfig.secretKey));

  expect(res.id).toBe(messageHandle);
  expect(res.date).toBe('2023-10-01T12:00:00Z');
});

test('should trigger sendblue library correctly with _passthrough', async () => {
  const messageHandle = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageHandle));

  const provider = new SendblueChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Simple text message',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
  };

  const res = await provider.sendMessage(options, {
    _passthrough: {
      body: {
        content: `${options.content} _passthrough`,
      },
    },
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(), {
    number: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    from_number: mockProviderConfig.from,
    content: `${options.content} _passthrough`,
  });

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.apiKey, mockProviderConfig.secretKey));

  expect(res.id).toBe(messageHandle);
});

test('should throw an error when sendblue returns an ERROR status', async () => {
  const { mockPost } = axiosSpy(buildResponse('', { status: 'ERROR', error_message: 'Invalid recipient number' }));

  const provider = new SendblueChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Simple text message',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
  };

  await expect(provider.sendMessage(options)).rejects.toThrow('Invalid recipient number');
  expect(mockPost).toHaveBeenCalled();
});

function baseUrl() {
  return 'https://api.sendblue.co/api/send-message';
}

function expectedHeaders(apiKey: string, secretKey: string) {
  return {
    headers: {
      'sb-api-key-id': apiKey,
      'sb-api-secret-key': secretKey,
      'Content-Type': 'application/json',
    },
  };
}
