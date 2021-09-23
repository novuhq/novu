import { IEmailProvider } from '../provider/provider.interface';
import { ChannelTypeEnum } from '../template/template.interface';
import { ITheme } from '../theme/theme.interface';
import { EmailHandler } from './email.handler';

test('send should call the provider method correctly', async () => {
  const provider: IEmailProvider = {
    id: 'email-provider',
    channelType: ChannelTypeEnum.EMAIL,
    sendMessage: () => null,
  };

  const theme: ITheme = {
    id: 'theme-id',
    branding: {
      logo: 'logo-url',
    },
    email: {
      layout: `<div data-test-id="theme-layout-wrapper"><img src="{{$branding.logo}}"/>{{{body}}}</div>`,
    },
  };
  const spy = jest.spyOn(provider, 'sendMessage');
  const emailHandler = new EmailHandler(
    {
      subject: 'test',
      channel: ChannelTypeEnum.EMAIL as ChannelTypeEnum,
      template: `<div><h1>Test Header</div> Name: {{firstName}}</div>`,
    },
    provider,
    theme
  );

  await emailHandler.send({
    $email: 'test@email.com',
    $user_id: '1234',
    firstName: 'test name',
  });

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith({
    html: `<div data-test-id="theme-layout-wrapper"><img src="logo-url"/><div><h1>Test Header</div> Name: test name</div></div>`,
    subject: 'test',
    to: 'test@email.com',
  });
  spy.mockRestore();
});
