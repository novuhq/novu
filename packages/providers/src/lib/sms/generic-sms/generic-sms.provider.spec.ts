import { expect, test } from 'vitest';
import crypto from 'crypto';
import { GenericSmsProvider } from './generic-sms.provider';
import { axiosSpy } from '../../../utils/test/spy-axios';

test('should trigger generic-sms library correctly', async () => {
  const { mockRequest: spy } = axiosSpy({
    data: {
      message: {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
      },
    },
  });

  const provider = new GenericSmsProvider({
    baseUrl: 'https://api.generic-sms-provider.com',
    apiKeyRequestHeader: 'apiKey',
    apiKey: '123456',
    from: 'sender-id',
    idPath: 'message.id',
    datePath: 'message.date',
  });

  await provider.sendMessage({
    to: '+1234567890',
    content: 'SMS Content form Generic SMS Provider',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: {
      to: '+1234567890',
      content: 'SMS Content form Generic SMS Provider',
      sender: 'sender-id',
    },
  });
});

test('should trigger generic-sms library correctly with _passthrough', async () => {
  const { mockRequest: spy } = axiosSpy({
    data: {
      message: {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
      },
    },
  });

  const provider = new GenericSmsProvider({
    baseUrl: 'https://api.generic-sms-provider.com',
    apiKeyRequestHeader: 'apiKey',
    apiKey: '123456',
    from: 'sender-id',
    idPath: 'message.id',
    datePath: 'message.date',
  });

  await provider.sendMessage(
    {
      to: '+1234567890',
      content: 'SMS Content form Generic SMS Provider',
    },
    {
      _passthrough: {
        body: {
          to: '+2234567890',
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    method: 'POST',
    data: {
      to: '+2234567890',
      content: 'SMS Content form Generic SMS Provider',
      sender: 'sender-id',
    },
  });
});
