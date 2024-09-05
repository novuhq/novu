import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { ClickatellSmsProvider } from './clickatell.provider';

test('should trigger clickatellSmsProvider library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      messages: [{ apiMessageId: '67890-90q8' }],
    },
  });

  const provider = new ClickatellSmsProvider({
    apiKey: '<clickatell-api-key>',
  });

  await provider.sendMessage({
    to: '+2347089736898',
    content: 'Test',
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(
    'https://platform.clickatell.com/messages',
    { binary: true, content: 'Test', to: ['+2347089736898'] },
    { headers: { Authorization: '<clickatell-api-key>' } },
  );
});

test('should trigger clickatellSmsProvider library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      messages: [{ apiMessageId: '67890-90q8' }],
    },
  });

  const provider = new ClickatellSmsProvider({
    apiKey: '<clickatell-api-key>',
  });

  await provider.sendMessage(
    {
      to: '+2347089736898',
      content: 'Test',
    },
    {
      _passthrough: {
        body: {
          binary: false,
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(
    'https://platform.clickatell.com/messages',
    { binary: false, content: 'Test', to: ['+2347089736898'] },
    { headers: { Authorization: '<clickatell-api-key>' } },
  );
});
