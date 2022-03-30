import { IDirectProvider } from '../provider/provider.interface';
import { ChannelTypeEnum } from '../template/template.interface';
import { DirectHandler } from './direct.handler';

test('send direct should call the provider method correctly', async () => {
  const provider: IDirectProvider = {
    id: 'direct-provider',
    channelType: ChannelTypeEnum.DIRECT,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spy = jest.spyOn(provider, 'sendMessage');
  const directHandler = new DirectHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.DIRECT,
      template: `Name: {{firstName}}`,
    },
    provider
  );

  await directHandler.send({
    $channel_id: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    content: 'Name: test name',
    channelId: '+1333322214',
  });
  spy.mockRestore();
});

test('send direct should template method correctly', async () => {
  const provider: IDirectProvider = {
    id: 'direct-provider',
    channelType: ChannelTypeEnum.DIRECT,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spyTemplateFunction = jest
    .fn()
    .mockImplementation(() => Promise.resolve('test'));

  const directHandler = new DirectHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.DIRECT,
      template: spyTemplateFunction,
    },
    provider
  );

  await directHandler.send({
    $channel_id: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spyTemplateFunction).toHaveBeenCalled();
  expect(spyTemplateFunction).toBeCalledWith({
    $channel_id: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
  });
});
