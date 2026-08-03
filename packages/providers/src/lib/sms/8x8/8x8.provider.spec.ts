import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { EightByEightSmsProvider } from './8x8.provider';

const mockConfig = {
  apiKey: '<8x8-api-key>',
  subAccountId: 'SubAccount-1',
  from: 'Acme Corp',
};

test('should trigger EightByEightSmsProvider library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      umid: '9e09ac86-bd74-5465-851d-1eb5a5fdbb9a',
      destination: '+2347089736898',
      status: { code: 'QUEUED', description: 'Message accepted' },
    },
  });

  const provider = new EightByEightSmsProvider(mockConfig);

  const res = await provider.sendMessage({
    to: '+2347089736898',
    content: 'Test',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    'https://sms.8x8.com/api/v1/subaccounts/SubAccount-1/messages',
    {
      destination: '+2347089736898',
      text: 'Test',
      source: 'Acme Corp',
    },
    {
      headers: {
        Authorization: 'Bearer <8x8-api-key>',
        'Content-Type': 'application/json',
      },
    }
  );

  expect(res.id).toBe('9e09ac86-bd74-5465-851d-1eb5a5fdbb9a');
});

test('should prefer the per-message `from` over the configured sender ID', async () => {
  const { mockPost: spy } = axiosSpy({
    data: { umid: 'umid-1', status: { code: 'QUEUED' } },
  });

  const provider = new EightByEightSmsProvider(mockConfig);

  await provider.sendMessage({
    to: '+2347089736898',
    content: 'Test',
    from: '+6512345678',
  });

  expect(spy).toHaveBeenCalledWith(
    'https://sms.8x8.com/api/v1/subaccounts/SubAccount-1/messages',
    expect.objectContaining({ source: '+6512345678' }),
    expect.anything()
  );
});

test('should throw when 8x8 rejects the message', async () => {
  axiosSpy({
    data: {
      umid: 'umid-2',
      status: { code: 'REJECTED', description: 'Invalid destination' },
    },
  });

  const provider = new EightByEightSmsProvider(mockConfig);

  await expect(
    provider.sendMessage({
      to: 'not-a-number',
      content: 'Test',
    })
  ).rejects.toThrow('8x8 SMS rejected: Invalid destination');
});

test('should forward `_passthrough` overrides', async () => {
  const { mockPost: spy } = axiosSpy({
    data: { umid: 'umid-3', status: { code: 'QUEUED' } },
  });

  const provider = new EightByEightSmsProvider(mockConfig);

  await provider.sendMessage(
    {
      to: '+2347089736898',
      content: 'Test',
    },
    {
      _passthrough: {
        body: { encoding: 'UCS2' },
      },
    }
  );

  expect(spy).toHaveBeenCalledWith(
    'https://sms.8x8.com/api/v1/subaccounts/SubAccount-1/messages',
    expect.objectContaining({ encoding: 'UCS2', text: 'Test' }),
    expect.anything()
  );
});
