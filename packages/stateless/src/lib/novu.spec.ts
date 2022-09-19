import { NovuStateless } from './novu';
import { CheckIntegrationResponseEnum } from './provider/provider.enum';
import { ChannelTypeEnum } from './template/template.interface';

test('should register an SMS provider and return it', async () => {
  const novu = new NovuStateless();

  const template = {
    id: 'test',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    setSubscriberCredentials: () => '123',
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
  };

  await novu.registerProvider('sms', template);
  const provider = await novu.getProviderByInternalId('test');

  expect(provider).toBeTruthy();
  expect(provider?.id).toEqual('test');
});

test('should call 2 hooks together', async () => {
  const novu = new NovuStateless();

  const template = {
    id: 'test',
    channelType: ChannelTypeEnum.SMS as ChannelTypeEnum,
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    setSubscriberCredentials: () => '123',
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
  };

  await novu.registerProvider('sms', template);
  await novu.registerTemplate({
    id: 'test-template',
    messages: [
      {
        channel: ChannelTypeEnum.SMS,
        template: 'test {{$user_id}}',
      },
    ],
  });

  const spyOn = jest.spyOn(novu, 'emit');

  await novu.trigger('test-template', {
    $user_id: 'test-user',
    $email: 'test-user@sd.com',
    $phone: '+12222222',
  });

  expect(spyOn).toHaveBeenCalledTimes(2);
});
