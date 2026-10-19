import { expect, test, vi } from 'vitest';
import { InfobipSmsProvider } from './infobip.provider';

const validBaseUrl = 'https://abc123.api.infobip.com';

test('should trigger infobip library correctly - SMS', async () => {
  const provider = new InfobipSmsProvider({
    baseUrl: validBaseUrl,
    apiKey: '<infobip-auth-token>',
  });

  const spy = vi.spyOn((provider as any).infobipClient.channels.sms, 'send').mockImplementation(async () => {
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

test('should trigger infobip library correctly - SMS with _passthrough', async () => {
  const provider = new InfobipSmsProvider({
    baseUrl: validBaseUrl,
    apiKey: '<infobip-auth-token>',
  });

  const spy = vi.spyOn((provider as any).infobipClient.channels.sms, 'send').mockImplementation(async () => {
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
    }
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

test('rejects unsafe base URLs at construction time', () => {
  expect(
    () =>
      new InfobipSmsProvider({
        baseUrl: 'http://localhost:8080',
        apiKey: '<infobip-auth-token>',
      })
  ).toThrow(/Infobip base URL blocked/);
});

test('rejects missing base URLs at construction time', () => {
  expect(
    () =>
      new InfobipSmsProvider({
        baseUrl: '',
        apiKey: '<infobip-auth-token>',
      })
  ).toThrow('Infobip base URL blocked: Base URL is required.');
});
