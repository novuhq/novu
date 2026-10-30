import { SmsEventStatusEnum } from '@novu/stateless';
import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { IMediaSmsProvider } from './imedia.provider';

const mockConfig = {
  token: 'test-token',
  from: 'NOVU',
};

test('should send an SMS and return the referentId', async () => {
  const { mockRequest: spy } = axiosSpy({
    data: { errorCode: '000', errorMessage: '', referentId: 'ref-123' },
  });

  const provider = new IMediaSmsProvider(mockConfig);

  const result = await provider.sendMessage({
    to: '84912345678',
    content: 'SMS content',
    id: 'novu-message-id',
  });

  expect(spy).toHaveBeenCalledWith({
    url: '/api/SMSBrandname/SendSMS',
    data: JSON.stringify({
      to: '84912345678',
      from: 'NOVU',
      message: 'SMS content',
      scheduled: '',
      requestId: 'novu-message-id',
      useUnicode: 1,
      type: 1,
    }),
    method: 'POST',
  });
  expect(result.id).toBe('ref-123');
});

test('should throw when iMedia returns an error code', async () => {
  axiosSpy({
    data: { errorCode: '101', errorMessage: 'Invalid token', referentId: '' },
  });

  const provider = new IMediaSmsProvider(mockConfig);

  await expect(
    provider.sendMessage({
      to: '84912345678',
      content: 'SMS content',
    })
  ).rejects.toThrow('iMedia API error: 101 - Invalid token');
});

test('should map a known webhook status', () => {
  const provider = new IMediaSmsProvider(mockConfig);

  const event = provider.parseEventBody({ referentId: 'ref-123', status: 'delivered' }, 'ref-123');

  expect(event?.status).toBe(SmsEventStatusEnum.DELIVERED);
  expect(event?.externalId).toBe('ref-123');
});

test('should ignore a webhook with an unknown status', () => {
  const provider = new IMediaSmsProvider(mockConfig);

  const event = provider.parseEventBody({ referentId: 'ref-123', status: 'something-new' }, 'ref-123');

  expect(event).toBeUndefined();
});
