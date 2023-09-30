import { IChatProvider } from '../provider/provider.interface';
import { ChannelTypeEnum } from '../template/template.interface';
import { ChatHandler } from './chat.handler';

test('send chat should call the provider method correctly', async () => {
  const provider: IChatProvider = {
    id: 'chat-provider',
    channelType: ChannelTypeEnum.CHAT,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spy = jest.spyOn(provider, 'sendMessage');
  const chatHandler = new ChatHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.CHAT,
      template: `Name: {{firstName}}`,
    },
    provider
  );

  await chatHandler.send({
    $channel_id: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
    $webhookUrl: 'https://test.com',
    $access_token: '123',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    content: 'Name: test name',
    webhookUrl: 'https://test.com',
  });
  spy.mockRestore();
});

test('send chat should template method correctly', async () => {
  const provider: IChatProvider = {
    id: 'chat-provider',
    channelType: ChannelTypeEnum.CHAT,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spyTemplateFunction = jest
    .fn()
    .mockImplementation(() => Promise.resolve('test'));

  const chatHandler = new ChatHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.CHAT,
      template: spyTemplateFunction,
    },
    provider
  );

  await chatHandler.send({
    $webhookUrl: 'https://test.com',
    $channel_id: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spyTemplateFunction).toHaveBeenCalled();
  expect(spyTemplateFunction).toBeCalledWith({
    $channel_id: '+1333322214',
    $user_id: '1234',
    $webhookUrl: 'https://test.com',
    firstName: 'test name',
  });
});
