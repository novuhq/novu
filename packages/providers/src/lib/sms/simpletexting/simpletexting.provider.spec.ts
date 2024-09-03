import { expect, test } from 'vitest';
import { SimpletextingSmsProvider } from './simpletexting.provider';

import { axiosSpy } from '../../../utils/test/spy-axios';

test('should trigger SimpletextingSmsProvider library correctly', async () => {
  const { mockPost } = axiosSpy({
    data: {
      id: '12345-67a8',
    },
  });
  const provider = new SimpletextingSmsProvider({
    apiKey: '<YOUR_SIMPLETEXTING_APIKEY>',
    accountPhone: '<SENDER_PHONE>',
  });

  const response = await provider.sendMessage({
    to: '+12345678902',
    content: 'test message',
  });

  expect(mockPost).toHaveBeenCalled();

  expect(mockPost).toHaveBeenCalledWith(
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
    },
  );

  expect(response).toHaveProperty('id');
});

test('should trigger SimpletextingSmsProvider library correctly with _passthrough', async () => {
  const { mockPost } = axiosSpy({
    data: {
      id: '12345-67a8',
    },
  });
  const provider = new SimpletextingSmsProvider({
    apiKey: '<YOUR_SIMPLETEXTING_APIKEY>',
    accountPhone: '<SENDER_PHONE>',
  });

  const response = await provider.sendMessage(
    {
      to: '+12345678902',
      content: 'test message',
    },
    {
      _passthrough: {
        body: {
          contactPhone: '+22345678902',
        },
      },
    },
  );

  expect(mockPost).toHaveBeenCalled();

  expect(mockPost).toHaveBeenCalledWith(
    'https://api-app2.simpletexting.com/v2/api/messages',
    {
      contactPhone: '+22345678902',
      accountPhone: '<SENDER_PHONE>',
      mode: 'SINGLE_SMS_STRICTLY',
      text: 'test message',
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer <YOUR_SIMPLETEXTING_APIKEY>`,
      },
    },
  );

  expect(response).toHaveProperty('id');
});
