import { expect, test } from 'vitest';
import { axiosSpy } from '../../../utils/test/spy-axios';
import { SmsCentralSmsProvider } from './sms-central.provider';

const mockConfig = {
  username: 'username',
  password: 'password',
  from: '123456789',
  baseUrl: 'http://foo.bar',
};

const mockNovuMessage = {
  to: '987654321',
  content: 'sms content',
};

test('should trigger sms-central library correctly', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: '0',
  });

  const provider = new SmsCentralSmsProvider(mockConfig);

  await provider.sendMessage(mockNovuMessage);

  const data = {
    ACTION: 'send',
    ORIGINATOR: mockConfig.from,
    USERNAME: mockConfig.username,
    PASSWORD: mockConfig.password,
    RECIPIENT: mockNovuMessage.to,
    MESSAGE_TEXT: mockNovuMessage.content,
  };

  expect(fakePost).toBeCalled();
  expect(fakePost).toBeCalledWith(mockConfig.baseUrl, data);
});

test('should trigger sms-central library correctly', async () => {
  const { mockPost: fakePost } = axiosSpy({
    data: '0',
  });

  const provider = new SmsCentralSmsProvider(mockConfig);

  await provider.sendMessage(mockNovuMessage, {
    _passthrough: {
      body: {
        RECIPIENT: '787654321',
      },
    },
  });

  const data = {
    ACTION: 'send',
    ORIGINATOR: mockConfig.from,
    USERNAME: mockConfig.username,
    PASSWORD: mockConfig.password,
    RECIPIENT: '787654321',
    MESSAGE_TEXT: mockNovuMessage.content,
  };

  expect(fakePost).toBeCalled();
  expect(fakePost).toBeCalledWith(mockConfig.baseUrl, data);
});
