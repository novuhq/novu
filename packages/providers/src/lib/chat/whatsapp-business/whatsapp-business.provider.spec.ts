import { ChannelEndpointByType, ENDPOINT_TYPES, IChatOptions } from '@novu/stateless';
import { nanoid } from 'nanoid';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { WhatsappBusinessChatProvider } from './whatsapp-business.provider';

const mockProviderConfig = {
  accessToken: 'my-access-token',
  phoneNumberIdentification: '1234567890',
};

const buildResponse = (messageId: string) => {
  return {
    data: {
      messaging_product: 'whatsapp',
      contacts: [{ input: 'Any input', wa_id: nanoid() }],
      messages: [{ id: messageId }],
    },
  };
};

test('should trigger whatsapp-business library correctly with simple text message', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

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
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.phoneNumberIdentification), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    text: {
      body: options.content,
      preview_url: false,
    },
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    type: 'text',
  });

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.accessToken));

  expect(res.id).toBe(messageId);
});

test('should trigger whatsapp-business library correctly with template message', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'Simple text message',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
    customData: {
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US',
        },
      },
    },
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.phoneNumberIdentification), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    template: options.customData.template,
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    type: 'template',
  });

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.accessToken));

  expect(res.id).toBe(messageId);
});

test('should trigger whatsapp-business library correctly with simple text message with _passthrough', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
    content: 'Simple text message',
  };

  const res = await provider.sendMessage(options, {
    _passthrough: {
      body: {
        text: {
          body: `${options.content} _passthrough`,
        },
      },
    },
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.phoneNumberIdentification), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    text: {
      body: `${options.content} _passthrough`,
      preview_url: false,
    },
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    type: 'text',
  });

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.accessToken));

  expect(res.id).toBe(messageId);
});

test('should trigger whatsapp-business library correctly with template message with _passthrough', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
    content: 'Simple text message',
    customData: {
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US',
        },
      },
    },
  };

  const res = await provider.sendMessage(options, {
    _passthrough: {
      body: {
        template: {
          name: 'hello_world_passthrough',
          language: {
            code: 'en_US',
          },
        },
      },
    },
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.phoneNumberIdentification), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    template: {
      name: 'hello_world_passthrough',
      language: {
        code: 'en_US',
      },
    },
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    type: 'template',
  });

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.accessToken));

  expect(res.id).toBe(messageId);
});

test('should resolve image type from bridgeProviderData without a stray text block', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'fallback text that must not be sent',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
  };

  const image = { link: 'https://example.com/photo.jpg' };

  const res = await provider.sendMessage(options, {
    type: 'image',
    image,
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.phoneNumberIdentification), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    type: 'image',
    image,
  });
  expect(mockPost.mock.calls[0][1]).not.toHaveProperty('text');

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.accessToken));

  expect(res.id).toBe(messageId);
});

test('should resolve template type from bridge _passthrough.body without a stray text block', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'fallback text that must not be sent',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
  };

  const template = {
    name: 'hello_world_passthrough',
    language: {
      code: 'en_US',
    },
  };

  const res = await provider.sendMessage(options, {
    _passthrough: {
      body: {
        template,
      },
    },
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.phoneNumberIdentification), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    type: 'template',
    template,
  });
  expect(mockPost.mock.calls[0][1]).not.toHaveProperty('text');

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.accessToken));

  expect(res.id).toBe(messageId);
});

test('should let explicit bridge type win over customData template key', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'fallback text that must not be sent',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
    customData: {
      template: {
        name: 'hello_world',
        language: {
          code: 'en_US',
        },
      },
    },
  };

  const image = { link: 'https://example.com/photo.jpg' };

  const res = await provider.sendMessage(options, {
    type: 'image',
    image,
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.phoneNumberIdentification), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    type: 'image',
    image,
  });
  expect(mockPost.mock.calls[0][1]).not.toHaveProperty('text');
  expect(mockPost.mock.calls[0][1]).not.toHaveProperty('template');

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.accessToken));

  expect(res.id).toBe(messageId);
});

test('should send reaction messages from bridgeProviderData', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(buildResponse(messageId));

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    content: 'fallback text that must not be sent',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+111111111' },
    },
  };

  const reaction = {
    message_id: 'wamid.reaction-target',
    emoji: '👍',
  };

  const res = await provider.sendMessage(options, {
    type: 'reaction',
    reaction,
  });

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(baseUrl(mockProviderConfig.phoneNumberIdentification), {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: (options.channelData.endpoint as ChannelEndpointByType[typeof ENDPOINT_TYPES.PHONE]).phoneNumber,
    type: 'reaction',
    reaction,
  });
  expect(mockPost.mock.calls[0][1]).not.toHaveProperty('text');

  expect(axiosMockSpy).toHaveBeenCalledWith(expectedHeaders(mockProviderConfig.accessToken));

  expect(res.id).toBe(messageId);
});

function baseUrl(phoneNumberIdentification: string) {
  return `https://graph.facebook.com/v22.0/${phoneNumberIdentification}/messages`;
}

function expectedHeaders(accessToken: string) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
}
