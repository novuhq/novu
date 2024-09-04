import { expect, test, vi } from 'vitest';
import { MessageBirdSmsProvider } from './messagebird.provider';

test('should trigger MessageBird correctly', async () => {
  const provider = new MessageBirdSmsProvider({
    access_key: 'your-access-key',
  });

  const mockResponse = {
    id: 'messagebird-message-id',
    date: new Date(),
  };

  const spy = vi
    .spyOn((provider as any).messageBirdClient.messages, 'create')
    .mockImplementation(async (params, callback) => {
      (callback as any)(null, mockResponse);
    });

  const testOptions = {
    from: '+123456',
    to: '+176543',
    content: 'Test SMS Content',
  };

  await provider.sendMessage(testOptions);

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(
    {
      originator: '+123456',
      recipients: ['+176543'],
      body: 'Test SMS Content',
    },
    expect.any(Function),
  );
});

test('should trigger MessageBird correctly with _passthrough', async () => {
  const provider = new MessageBirdSmsProvider({
    access_key: 'your-access-key',
  });

  const mockResponse = {
    id: 'messagebird-message-id',
    date: new Date(),
  };

  const spy = vi
    .spyOn((provider as any).messageBirdClient.messages, 'create')
    .mockImplementation(async (params, callback) => {
      (callback as any)(null, mockResponse);
    });

  const testOptions = {
    from: '+123456',
    to: '+176543',
    content: 'Test SMS Content',
  };

  await provider.sendMessage(testOptions, {
    _passthrough: {
      body: {
        originator: '+223456',
      },
    },
  });

  expect(spy).toHaveBeenCalled();

  expect(spy).toHaveBeenCalledWith(
    {
      originator: '+223456',
      recipients: ['+176543'],
      body: 'Test SMS Content',
    },
    expect.any(Function),
  );
});
