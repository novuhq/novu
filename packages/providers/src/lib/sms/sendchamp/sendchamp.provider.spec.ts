import { expect, test } from 'vitest';
import { SendchampSmsProvider } from './sendchamp.provider';
import { axiosSpy } from '../../../utils/test/spy-axios';

const mockConfig = {
  apiKey: 'test-key',
  from: 'sendchamp',
};

const mockNovuMessage = {
  to: '2348055372961',
  content: 'sms content',
};

test('should trigger sendchamp library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      data: {
        business_id: '67890-90q8',
        created_at: new Date().toISOString(),
      },
    },
  });

  const smsProvider = new SendchampSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockNovuMessage);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith('/sms/send', {
    body: {
      message: 'sms content',
      route: 'international',
      sender_name: 'sendchamp',
      to: '2348055372961',
    },
    headers: {},
    query: {},
  });
});

test('should trigger sendchamp library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      data: {
        business_id: '67890-90q8',
        created_at: new Date().toISOString(),
      },
    },
  });

  const smsProvider = new SendchampSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        to: '3348055372961',
      },
    },
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith('/sms/send', {
    body: {
      message: 'sms content',
      route: 'international',
      sender_name: 'sendchamp',
      to: '3348055372961',
    },
    headers: {},
    query: {},
  });
});
