import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { BulkSmsProvider } from './bulk-sms.provider';

const mockConfig = {
  apiToken: 'test-key',
  from: '45482346',
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
    '{"to":"2348055372961","body":"sms content","from":{"type":"INTERNATIONAL","address":"45483533"},"userSuppliedId":"BLKTM.NOVU.01.00.00"}',
    {
      headers: {
        Authorization: 'Basic dGVzdC1rZXk=',
        'Content-Type': 'application/json',
      },
    }
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
    '{"to":"3348055372961","body":"sms content","from":{"type":"INTERNATIONAL","address":"45483533"},"userSuppliedId":"BLKTM.NOVU.01.00.00"}',
    {
      headers: {
        Authorization: 'Basic dGVzdC1rZXk=',
        'Content-Type': 'application/json',
      },
    }
  );
});

test('should strip a leading + from an international sender number', async () => {
  const { mockPost: spy } = axiosSpy({
    data: [
      {
        id: '67890-90q8',
        date: new Date().toISOString(),
      },
    ],
  });
  const smsProvider = new BulkSmsProvider(mockConfig);

  await smsProvider.sendMessage({ ...mockBulkSMSMessage, from: '+447700900123' });

  const body = JSON.parse(spy.mock.calls[0][1] as string);
  expect(body.from).toEqual({ type: 'INTERNATIONAL', address: '447700900123' });
});

test('should send an alphanumeric sender name', async () => {
  const { mockPost: spy } = axiosSpy({
    data: [
      {
        id: '67890-90q8',
        date: new Date().toISOString(),
      },
    ],
  });
  const smsProvider = new BulkSmsProvider(mockConfig);

  await smsProvider.sendMessage({ ...mockBulkSMSMessage, from: 'Novu' });

  const body = JSON.parse(spy.mock.calls[0][1] as string);
  expect(body.from).toEqual({ type: 'ALPHANUMERIC', address: 'Novu' });
});
