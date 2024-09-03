import { expect, test, vi } from 'vitest';
import { InfobipSmsProvider } from './infobip.provider';

test('should trigger infobip library correctly - SMS', async () => {
  const provider = new InfobipSmsProvider({
    baseUrl: 'localhost',
    apiKey: '<infobip-auth-token>',
  });

  const spy = vi
    .spyOn((provider as any).infobipClient.channels.sms, 'send')
    .mockImplementation(async () => {
      return {
        data: {
          messages: [
            {
              messageId: '<a-valid-message-id>',
            },
          ],
        },
      };
    });

  await provider.sendMessage({
    to: '44123456',
    content: 'Hello World',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    messages: [
      {
        destinations: [
          {
            to: '44123456',
          },
        ],
        text: 'Hello World',
      },
    ],
  });
});

test('should trigger infobip library correctly - SMS', async () => {
  const provider = new InfobipSmsProvider({
    baseUrl: 'localhost',
    apiKey: '<infobip-auth-token>',
  });

  const spy = vi
    .spyOn((provider as any).infobipClient.channels.sms, 'send')
    .mockImplementation(async () => {
      return {
        data: {
          messages: [
            {
              messageId: '<a-valid-message-id>',
            },
          ],
        },
      };
    });

  await provider.sendMessage(
    {
      to: '44123456',
      content: 'Hello World',
    },
    {
      _passthrough: {
        body: {
          text: 'Hello World _passthrough',
        },
      },
    },
  );

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    messages: [
      {
        destinations: [
          {
            to: '44123456',
          },
        ],
        text: 'Hello World _passthrough',
      },
    ],
  });
});
