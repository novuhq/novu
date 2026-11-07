import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { SendchampSmsProvider } from './sendchamp.provider';

const mockConfig = {
  apiKey: 'test-key',
  from: 'sendchamp',
};

const mockNovuMessage = {
  to: '2348055372961',
  content: 'sms content',
};

const mockResponse = {
  data: {
    data: {
      business_id: '67890-90q8',
      created_at: new Date().toISOString(),
    },
  },
};

test('should trigger sendchamp library correctly', async () => {
  const { mockPost: spy } = axiosSpy(mockResponse);

  const smsProvider = new SendchampSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(
    '/sms/send',
    {
      message: 'sms content',
      route: 'international',
      sender_name: 'sendchamp',
      to: '2348055372961',
    },
    { headers: {} }
  );
});

test('should trigger sendchamp library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy(mockResponse);

  const smsProvider = new SendchampSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        to: '3348055372961',
      },
    },
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(
    '/sms/send',
    {
      message: 'sms content',
      route: 'international',
      sender_name: 'sendchamp',
      to: '3348055372961',
    },
    { headers: {} }
  );
});

test('should send _passthrough headers with the request', async () => {
  const { mockPost: spy } = axiosSpy(mockResponse);

  const smsProvider = new SendchampSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockNovuMessage, {
    _passthrough: {
      headers: {
        'X-Custom': 'value',
      },
    },
  });

  expect(spy).toHaveBeenCalledWith('/sms/send', expect.any(Object), {
    headers: { 'X-Custom': 'value' },
  });
});
