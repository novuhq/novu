import { ISmsProvider } from '../provider/provider.interface';
import { ChannelTypeEnum } from '../template/template.interface';
import { SmsHandler } from './sms.handler';

test('send sms should call the provider method correctly', async () => {
  const provider: ISmsProvider = {
    id: 'sms-provider',
    channelType: ChannelTypeEnum.SMS,
    sendMessage: () => null,
  };

  const spy = jest.spyOn(provider, 'sendMessage');
  const emailHandler = new SmsHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.SMS,
      template: `Name: {{firstName}}`,
    },
    provider
  );

  await emailHandler.send({
    $email: 'test@email.com',
    $phone: '+1333322214',
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith('+1333322214', `Name: test name`);
  spy.mockRestore();
});
