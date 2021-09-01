import { IEmailProvider } from '../provider/provider.interface';
import { ChannelTypeEnum } from '../template/template.interface';
import { EmailHandler } from './email.handler';

test('send should call the provider method correctly', async () => {
  const provider: IEmailProvider = {
    id: 'email-provider',
    channelType: ChannelTypeEnum.EMAIL,
    sendMessage: () => null,
  };

  const spy = jest.spyOn(provider, 'sendMessage');
  const emailHandler = new EmailHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.EMAIL as ChannelTypeEnum,
      template: `<div><h1>Test Header</div> Name: {{firstName}}</div>`,
    },
    provider
  );

  await emailHandler.send({
    $email: 'test@email.com',
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(
    'test@email.com',
    'test',
    `<div><h1>Test Header</div> Name: test name</div>`,
    { $email: 'test@email.com', $user_id: '1234', firstName: 'test name' }
  );
  spy.mockRestore();
});
