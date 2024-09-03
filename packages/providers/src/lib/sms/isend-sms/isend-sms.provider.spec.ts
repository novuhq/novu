import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { ISendSmsProvider } from './isend-sms.provider';

const mockConfig = {
  apiToken: 'test-key',
};

const mockBulkSMSMessage = {
  to: '2348055372961',
  content: 'sms content',
  from: '45483533',
};

test('should trigger isend-sms library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      status: 'success',
      data: {
        uid: '67890-90q8',
      },
    },
  });
  const smsProvider = new ISendSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockBulkSMSMessage);
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    '/api/v3/sms/send',
    '{"sender_id":"45483533","recipient":"2348055372961","type":"unicode","message":"sms content"}',
  );
});

test('should trigger isend-sms library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      status: 'success',
      data: {
        uid: '67890-90q8',
      },
    },
  });
  const smsProvider = new ISendSmsProvider(mockConfig);

  await smsProvider.sendMessage(mockBulkSMSMessage, {
    _passthrough: {
      body: {
        sender_id: '55483533',
      },
    },
  });
  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    '/api/v3/sms/send',
    '{"sender_id":"55483533","recipient":"2348055372961","type":"unicode","message":"sms content"}',
  );
});
