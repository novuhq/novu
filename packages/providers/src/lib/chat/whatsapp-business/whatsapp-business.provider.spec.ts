import axios from 'axios';
import { WhatsappBusinessChatProvider } from './whatsapp-business.provider';
import { nanoid } from 'nanoid';
import { IChatOptions } from '@novu/stateless';

const mockProviderConfig = {
  accessToken: 'my-access-token',
  phoneNumberIdentification: '1234567890',
};

test('should trigger whatsapp-business library correctly with simple text message', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(messageId);

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    phoneNumber: '+111111111',
    content: 'Simple text message',
  };

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(
    baseUrl(mockProviderConfig.phoneNumberIdentification),
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      text: {
        body: options.content,
        preview_url: false,
      },
      to: options.phoneNumber,
      type: 'text',
    }
  );

  expect(axiosMockSpy).toHaveBeenCalledWith(
    expectedHeaders(mockProviderConfig.accessToken)
  );

  expect(res.id).toBe(messageId);
});

test('should trigger whatsapp-business library correctly with template message', async () => {
  const messageId = nanoid();

  const { mockPost, axiosMockSpy } = axiosSpy(messageId);

  const provider = new WhatsappBusinessChatProvider(mockProviderConfig);

  const options: IChatOptions = {
    phoneNumber: '+111111111',
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

  const res = await provider.sendMessage(options);

  expect(mockPost).toHaveBeenCalled();
  expect(mockPost).toHaveBeenCalledWith(
    baseUrl(mockProviderConfig.phoneNumberIdentification),
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      template: options.customData.template,
      to: options.phoneNumber,
      type: 'template',
    }
  );

  expect(axiosMockSpy).toHaveBeenCalledWith(
    expectedHeaders(mockProviderConfig.accessToken)
  );

  expect(res.id).toBe(messageId);
});

function axiosSpy(messageId: string) {
  const mockPost = jest.fn(() => {
    return {
      data: {
        messaging_product: 'whatsapp',
        contacts: [{ input: 'Any input', wa_id: nanoid() }],
        messages: [{ id: messageId }],
      },
    };
  });

  const axiosMockSpy = jest.spyOn(axios, 'create').mockImplementation(() => {
    return {
      post: mockPost,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  });

  return { mockPost, axiosMockSpy };
}

function baseUrl(phoneNumberIdentification: string) {
  return `https://graph.facebook.com/v18.0/${phoneNumberIdentification}/messages`;
}

function expectedHeaders(accessToken: string) {
  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };
}
