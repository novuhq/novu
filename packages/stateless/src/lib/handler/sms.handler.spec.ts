import { ISmsProvider } from '../provider/provider.interface';
import { ChannelTypeEnum } from '../template/template.interface';
import { SmsHandler } from './sms.handler';

test('send sms should call the provider method correctly', async () => {
  const provider: ISmsProvider = {
    id: 'sms-provider',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spy = jest.spyOn(provider, 'sendMessage');
  const smsHandler = new SmsHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.SMS,
      template: `Name: {{firstName}}`,
    },
    provider
  );

  await smsHandler.send({
    $email: 'test@email.com',
    $phone: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    content: 'Name: test name',
    to: '+1333322214',
  });
  spy.mockRestore();
});

test('send sms should template method correctly', async () => {
  const provider: ISmsProvider = {
    id: 'sms-provider',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spyTemplateFunction = jest
    .fn()
    .mockImplementation(() => Promise.resolve('test'));

  const smsHandler = new SmsHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.SMS,
      template: spyTemplateFunction,
    },
    provider
  );

  await smsHandler.send({
    $email: 'test@email.com',
    $phone: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spyTemplateFunction).toHaveBeenCalled();
  expect(spyTemplateFunction).toBeCalledWith({
    $email: 'test@email.com',
    $phone: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
  });
});

test('send should handle attachments correctly', async () => {
  const provider: ISmsProvider = {
    id: 'sms-provider',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const spy = jest.spyOn(provider, 'sendMessage');
  const smsHandler = new SmsHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.SMS as ChannelTypeEnum,
      template: `<div><h1>Test Header</div> Name: {{firstName}}</div>`,
    },
    provider
  );

  await smsHandler.send({
    $email: 'test@email.com',
    $phone: '+1333322214',
    $user_id: '1234',
    $attachments: [
      {
        mime: 'email',
        file: Buffer.from(''),
        channels: [ChannelTypeEnum.EMAIL],
      },
      {
        mime: 'sms',
        file: Buffer.from(''),
        channels: [ChannelTypeEnum.SMS],
      },
      {
        mime: 'all',
        file: Buffer.from(''),
      },
    ],
    firstName: 'test name',
  });

  expect(spy).toHaveBeenCalled();
  const attachments = spy.mock.calls[0][0].attachments || [];

  expect(attachments.length).toBe(2);
  expect(attachments[0].channels?.includes(ChannelTypeEnum.SMS)).toBeTruthy();
  expect(attachments[1].channels).toBeUndefined();
  spy.mockRestore();
});
