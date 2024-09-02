import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { ClicksendSmsProvider } from './clicksend.provider';

test('should trigger ClicksendSmsProvider library correctly', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      data: {
        messages: [
          {
            message_id: '12345-67a8',
            date: new Date().toISOString(),
          },
        ],
      },
    },
  });

  const provider = new ClicksendSmsProvider({
    username: '<your-clicksend-username>',
    apiKey: '<your-clicksend-API>',
  });

  await provider.sendMessage({
    to: '+0451111111',
    content: 'test message',
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(
    'https://rest.clicksend.com/v3/sms/send',
    { messages: [{ body: 'test message', to: '+0451111111' }] },
    {
      headers: {
        Authorization:
          'Basic PHlvdXItY2xpY2tzZW5kLXVzZXJuYW1lPjo8eW91ci1jbGlja3NlbmQtQVBJPg==',
      },
    },
  );
});

test('should trigger ClicksendSmsProvider library correctly with _passthrough', async () => {
  const { mockPost: spy } = axiosSpy({
    data: {
      data: {
        messages: [
          {
            message_id: '12345-67a8',
            date: new Date().toISOString(),
          },
        ],
      },
    },
  });

  const provider = new ClicksendSmsProvider({
    username: '<your-clicksend-username>',
    apiKey: '<your-clicksend-API>',
  });

  await provider.sendMessage(
    {
      to: '+0451111111',
      content: 'test message',
    },
    {
      _passthrough: {
        body: {
          to: '+1451111111',
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(
    'https://rest.clicksend.com/v3/sms/send',
    { messages: [{ body: 'test message', to: '+1451111111' }] },
    {
      headers: {
        Authorization:
          'Basic PHlvdXItY2xpY2tzZW5kLXVzZXJuYW1lPjo8eW91ci1jbGlja3NlbmQtQVBJPg==',
      },
    },
  );
});
