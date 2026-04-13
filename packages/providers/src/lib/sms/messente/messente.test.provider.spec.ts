import { expect, test, vi } from 'vitest';
import { MessenteSmsProvider } from './messente.provider';

const sendOmnimessageMock = vi.hoisted(() => vi.fn());

vi.mock('messente_api', () => ({
  ApiClient: {
    instance: {
      authentications: {
        basicAuth: { username: '', password: '' },
      },
    },
  },
  OmnimessageApi: vi.fn(() => ({
    sendOmnimessage: sendOmnimessageMock,
  })),
}));

test('should trigger messente library correctly', async () => {
  sendOmnimessageMock.mockImplementation((_params, callback) => {
    callback(null, {
      to: '+176543',
      messages: [{ channel: 'sms', message_id: 'test-message-id', sender: '+112345' }],
    });
  });

  const provider = new MessenteSmsProvider({
    username: 'test-username',
    password: 'test-password',
  });

  const response = await provider.sendMessage({
    to: '+176543',
    content: 'SMS Content',
    from: '+112345',
  });

  expect(sendOmnimessageMock).toHaveBeenCalledWith(
    {
      to: '+176543',
      messages: [{ channel: 'sms', text: 'SMS Content', sender: '+112345' }],
    },
    expect.any(Function)
  );
  expect(response.id).toBe('test-message-id');
});

test('should trigger messente library correctly with _passthrough', async () => {
  sendOmnimessageMock.mockImplementation((_params, callback) => {
    callback(null, {
      to: '+299999',
      messages: [{ channel: 'sms', message_id: 'passthrough-message-id', sender: '+112345' }],
    });
  });

  const provider = new MessenteSmsProvider({
    username: 'test-username',
    password: 'test-password',
  });

  const response = await provider.sendMessage(
    {
      to: '+176543',
      content: 'SMS Content',
      from: '+112345',
    },
    {
      _passthrough: {
        body: {
          to: '+299999',
        },
      },
    }
  );

  expect(sendOmnimessageMock).toHaveBeenCalledWith(
    {
      to: '+299999',
      messages: [{ channel: 'sms', text: 'SMS Content', sender: '+112345' }],
    },
    expect.any(Function)
  );
  expect(response.id).toBe('passthrough-message-id');
});
