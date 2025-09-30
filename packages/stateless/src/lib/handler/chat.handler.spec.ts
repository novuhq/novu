import { ENDPOINT_TYPES } from '../provider/channel-data.type';
import { IChatProvider } from '../provider/provider.interface';
import { ChannelTypeEnum } from '../template/template.interface';
import { ChatHandler } from './chat.handler';

test('send chat should call the provider method correctly with legacy webhookUrl format', async () => {
  const provider: IChatProvider = {
    id: 'chat-provider',
    channelType: ChannelTypeEnum.CHAT,
    sendMessage: () => Promise.resolve({ id: '1', date: new Date().toString() }),
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
  expect(spy).toHaveBeenCalledWith(
    {
      channelData: {
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: {
          url: 'https://test.com',
          channel: '+1333322214',
        },
        identifier: '-',
      },
      content: 'Name: test name',
    },
    {}
  );
  spy.mockRestore();
});

test('send chat should call the provider method correctly with new channelData format', async () => {
  const provider: IChatProvider = {
    id: 'chat-provider',
    channelType: ChannelTypeEnum.CHAT,
    sendMessage: () => Promise.resolve({ id: '1', date: new Date().toString() }),
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
    $channelData: {
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: {
        url: 'https://test.com',
        channel: '+1333322214',
      },
      identifier: 'test-webhook-identifier',
    },
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    {
      channelData: {
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: {
          url: 'https://test.com',
          channel: '+1333322214',
        },
        identifier: 'test-webhook-identifier',
      },
      content: 'Name: test name',
    },
    {}
  );
  spy.mockRestore();
});

test('send chat should template method correctly with legacy format', async () => {
  const provider: IChatProvider = {
    id: 'chat-provider',
    channelType: ChannelTypeEnum.CHAT,
    sendMessage: () => Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spyTemplateFunction = jest.fn().mockImplementation(() => Promise.resolve('test'));

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
  expect(spyTemplateFunction).toHaveBeenCalledWith({
    $channel_id: '+1333322214',
    $user_id: '1234',
    $webhookUrl: 'https://test.com',
    firstName: 'test name',
  });
});

test('send chat should template method correctly with new channelData format', async () => {
  const provider: IChatProvider = {
    id: 'chat-provider',
    channelType: ChannelTypeEnum.CHAT,
    sendMessage: () => Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spyTemplateFunction = jest.fn().mockImplementation(() => Promise.resolve('test'));

  const chatHandler = new ChatHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.CHAT,
      template: spyTemplateFunction,
    },
    provider
  );

  await chatHandler.send({
    $channelData: {
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: {
        url: 'https://test.com',
        channel: '+1333322214',
      },
      identifier: 'test-webhook-identifier',
    },
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spyTemplateFunction).toHaveBeenCalled();
  expect(spyTemplateFunction).toHaveBeenCalledWith({
    $channelData: {
      type: ENDPOINT_TYPES.WEBHOOK,
      endpoint: {
        url: 'https://test.com',
        channel: '+1333322214',
      },
      identifier: 'test-webhook-identifier',
    },
    $user_id: '1234',
    firstName: 'test name',
  });
});

test('send chat should throw error when neither channelData nor webhookUrl provided', async () => {
  const provider: IChatProvider = {
    id: 'chat-provider',
    channelType: ChannelTypeEnum.CHAT,
    sendMessage: () => Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const chatHandler = new ChatHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.CHAT,
      template: `Name: {{firstName}}`,
    },
    provider
  );

  await expect(
    chatHandler.send({
      $user_id: '1234',
      firstName: 'test name',
    })
  ).rejects.toThrow(
    'Channel data is missing in trigger payload. To send a chat message you must specify either a channelData property or a webhookUrl property.'
  );
});
