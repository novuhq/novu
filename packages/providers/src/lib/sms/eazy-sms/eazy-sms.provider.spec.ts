import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { EazySmsProvider } from './eazy-sms.provider';

const mockConfig = {
  apiKey: 'test-key',
  channelId: 'test-key@sms.eazy.im',
};

const mockSMSMessage = {
  to: '1234567890',
  content: 'sms content',
};

test('should trigger eazy-sms library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      id: '2574a339-86ff',
    },
  });
  const smsProvider = new EazySmsProvider(mockConfig);

  await smsProvider.sendMessage(mockSMSMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    'https://api.eazy.im/v3/channels/test-key@sms.eazy.im/messages/1234567890@sms.eazy.im',
    { message: { text: 'sms content', type: 'text' } },
    {
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
    },
  );
});

test('should trigger eazy-sms library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      id: '2574a339-86ff',
    },
  });
  const smsProvider = new EazySmsProvider(mockConfig);

  await smsProvider.sendMessage(mockSMSMessage, {
    _passthrough: {
      body: {
        message: { text: 'sms content _passthrough' },
      },
    },
  });
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    'https://api.eazy.im/v3/channels/test-key@sms.eazy.im/messages/1234567890@sms.eazy.im',
    { message: { text: 'sms content _passthrough', type: 'text' } },
    {
      headers: {
        Authorization: 'Bearer test-key',
        'Content-Type': 'application/json',
      },
    },
  );
});
