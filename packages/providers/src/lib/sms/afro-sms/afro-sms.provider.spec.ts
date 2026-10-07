import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { AfroSmsProvider } from './afro-sms.provider';

const mockConfig = {
  apiKey: 'test-api-key',
  senderName: 'NOVU',
  from: 'configured-identifier',
};

// axiosSpy's `get` resolves to the value passed as `data`, so wrap the API body in `data`
const successResponse = {
  data: {
    acknowledge: 'success',
    response: { message_id: 'msg-123' },
  },
};

test('should send an SMS with the configured from', async () => {
  const { mockGet: spy } = axiosSpy({ data: successResponse });

  const provider = new AfroSmsProvider(mockConfig);

  const result = await provider.sendMessage({
    to: '+251911000000',
    content: 'SMS content',
  });

  expect(spy).toHaveBeenCalledWith('https://api.afromessage.com/api/send', {
    params: {
      from: 'configured-identifier',
      sender: 'NOVU',
      to: '+251911000000',
      message: 'SMS content',
    },
    headers: {
      Authorization: 'Bearer test-api-key',
    },
  });
  expect(result.id).toBe('msg-123');
});

test('should let the step from override win over the configured from', async () => {
  const { mockGet: spy } = axiosSpy({ data: successResponse });

  const provider = new AfroSmsProvider(mockConfig);

  await provider.sendMessage({
    to: '+251911000000',
    content: 'SMS content',
    from: 'override-identifier',
  });

  expect(spy).toHaveBeenCalledWith(
    'https://api.afromessage.com/api/send',
    expect.objectContaining({
      params: expect.objectContaining({ from: 'override-identifier' }),
    })
  );
});

test('should throw when AfroSMS does not acknowledge the message', async () => {
  axiosSpy({ data: { data: { acknowledge: 'error', response: 'Invalid sender' } } });

  const provider = new AfroSmsProvider(mockConfig);

  await expect(
    provider.sendMessage({
      to: '+251911000000',
      content: 'SMS content',
    })
  ).rejects.toThrow('AfroSMS error: Invalid sender');
});
