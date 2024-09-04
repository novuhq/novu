import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { GupshupSmsProvider } from './gupshup.provider';

test('should trigger gupshup library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: `success | sent | ${Math.ceil(Math.random() * 100)}`,
  });

  const provider = new GupshupSmsProvider({
    userId: '1',
    password: 'password',
  });

  await provider.sendMessage({
    content: 'Your otp code is 32901',
    from: 'GupshupTest',
    to: '+2347063317344',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    'https://enterprise.smsgupshup.com/GatewayAPI/rest',
    {
      auth_scheme: 'plain',
      format: 'text',
      method: 'sendMessage',
      msg: 'Your otp code is 32901',
      msg_type: 'text',
      password: 'password',
      send_to: '+2347063317344',
      userid: '1',
      v: '1.1',
    },
  );
});

test('should trigger gupshup library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: `success | sent | ${Math.ceil(Math.random() * 100)}`,
  });

  const provider = new GupshupSmsProvider({
    userId: '1',
    password: 'password',
  });

  await provider.sendMessage(
    {
      content: 'Your otp code is 32901',
      from: 'GupshupTest',
      to: '+2347063317344',
    },
    {
      _passthrough: {
        body: {
          send_to: '+3347063317344',
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    'https://enterprise.smsgupshup.com/GatewayAPI/rest',
    {
      auth_scheme: 'plain',
      format: 'text',
      method: 'sendMessage',
      msg: 'Your otp code is 32901',
      msg_type: 'text',
      password: 'password',
      send_to: '+3347063317344',
      userid: '1',
      v: '1.1',
    },
  );
});
