import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { BulkSmsProvider } from './bulk-sms.provider';

const mockConfig = {
  apiToken: 'test-key',
};

const mockBulkSMSMessage = {
  to: '2348055372961',
  content: 'sms content',
  from: '45483533',
};

test('should trigger bulk-sms library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: [
      {
        id: '67890-90q8',
        date: new Date().toISOString(),
      },
    ],
  });
  const smsProvider = new BulkSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockBulkSMSMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    'https://api.bulksms.com/v1/messages',
    '{"to":"2348055372961","body":"sms content","from":"45483533"}',
    {
      headers: {
        Authorization: 'Basic dGVzdC1rZXk=',
        'Content-Type': 'application/json',
      },
    },
  );
});

test('should trigger bulk-sms library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: [
      {
        id: '67890-90q8',
        date: new Date().toISOString(),
      },
    ],
  });
  const smsProvider = new BulkSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockBulkSMSMessage, {
    _passthrough: {
      body: {
        to: '3348055372961',
      },
    },
  });
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    'https://api.bulksms.com/v1/messages',
    '{"to":"3348055372961","body":"sms content","from":"45483533"}',
    {
      headers: {
        Authorization: 'Basic dGVzdC1rZXk=',
        'Content-Type': 'application/json',
      },
    },
  );
});
