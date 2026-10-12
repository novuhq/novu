import { ENDPOINT_TYPES, IChatOptions } from '@novu/stateless';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { EightByEightWhatsAppChatProvider } from './8x8-whatsapp.provider';

const mockConfig = {
  apiKey: '<8x8-api-key>',
  subAccountId: 'SubAccount-1',
};

const messagesUrl = 'https://chatapps.8x8.com/api/v1/subaccounts/SubAccount-1/messages';

test('should trigger EightByEightWhatsAppChatProvider correctly with a text message', async () => {
  const { mockPost, axiosMockSpy } = axiosSpy({
    data: { umid: '9e09ac86-bd74-5465-851d-1eb5a5fdbb9a' },
  });

  const provider = new EightByEightWhatsAppChatProvider(mockConfig);

  const options: IChatOptions = {
    content: 'Simple text message',
    channelData: {
      identifier: '-',
      type: ENDPOINT_TYPES.PHONE,
      endpoint: { phoneNumber: '+15551234567' },
    },
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalledWith(messagesUrl, {
    user: { msisdn: '+15551234567' },
    type: 'text',
    content: { text: 'Simple text message' },
  });

  expect(axiosMockSpy).toHaveBeenCalledWith({
    headers: {
      Authorization: 'Bearer <8x8-api-key>',
      'Content-Type': 'application/json',
    },
  });

  expect(res.id).toBe('9e09ac86-bd74-5465-851d-1eb5a5fdbb9a');
});

test('should throw when channel data is not a phone endpoint', async () => {
  axiosSpy({ data: { umid: 'umid-1' } });

  const provider = new EightByEightWhatsAppChatProvider(mockConfig);

  await expect(
    provider.sendMessage({
      content: 'Simple text message',
      channelData: {
        identifier: '-',
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: { url: 'https://example.com' },
      },
    })
  ).rejects.toThrow('Invalid channel data for 8x8 WhatsApp provider');
});

test('should deep-merge `_passthrough` overrides into the payload', async () => {
  const { mockPost } = axiosSpy({ data: { umid: 'umid-2' } });

  const provider = new EightByEightWhatsAppChatProvider(mockConfig);

  await provider.sendMessage(
    {
      content: 'fallback',
      channelData: {
        identifier: '-',
        type: ENDPOINT_TYPES.PHONE,
        endpoint: { phoneNumber: '+15551234567' },
      },
    },
    {
      _passthrough: {
        body: {
          content: { text: 'overridden' },
        },
      },
    }
  );

  expect(mockPost).toHaveBeenCalledWith(messagesUrl, {
    user: { msisdn: '+15551234567' },
    type: 'text',
    content: { text: 'overridden' },
  });
});

const phoneOptions = (content = 'fallback'): IChatOptions => ({
  content,
  channelData: {
    identifier: '-',
    type: ENDPOINT_TYPES.PHONE,
    endpoint: { phoneNumber: '+15551234567' },
  },
});

test('should send a business-initiated template via `_passthrough` without a stray text body', async () => {
  const { mockPost } = axiosSpy({ data: { umid: 'umid-tmpl' } });

  const provider = new EightByEightWhatsAppChatProvider(mockConfig);

  await provider.sendMessage(phoneOptions(), {
    _passthrough: {
      body: {
        type: 'template',
        content: { template: { name: 'order_update', language: 'en_US' } },
      },
    },
  });

  expect(mockPost).toHaveBeenCalledWith(messagesUrl, {
    user: { msisdn: '+15551234567' },
    type: 'template',
    content: { template: { name: 'order_update', language: 'en_US' } },
  });
});

test('should infer the template type from a `content.template` key in customData', async () => {
  const { mockPost } = axiosSpy({ data: { umid: 'umid-tmpl-2' } });

  const provider = new EightByEightWhatsAppChatProvider(mockConfig);

  await provider.sendMessage({
    ...phoneOptions(),
    customData: { content: { template: { name: 'appointment_reminder', language: 'en_US' } } },
  });

  expect(mockPost).toHaveBeenCalledWith(messagesUrl, {
    user: { msisdn: '+15551234567' },
    type: 'template',
    content: { template: { name: 'appointment_reminder', language: 'en_US' } },
  });
});

test('should send a media (image) message when the type is set explicitly', async () => {
  const { mockPost } = axiosSpy({ data: { umid: 'umid-img' } });

  const provider = new EightByEightWhatsAppChatProvider(mockConfig);

  await provider.sendMessage({
    ...phoneOptions(),
    customData: { type: 'image', content: { url: 'https://example.com/receipt.jpg', text: 'Your receipt' } },
  });

  expect(mockPost).toHaveBeenCalledWith(messagesUrl, {
    user: { msisdn: '+15551234567' },
    type: 'image',
    content: { url: 'https://example.com/receipt.jpg', text: 'Your receipt' },
  });
});
