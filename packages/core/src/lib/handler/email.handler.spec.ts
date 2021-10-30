import { IEmailProvider } from '../provider/provider.interface';
import { ChannelTypeEnum } from '../template/template.interface';
import { IEmailTemplate, ITheme } from '../theme/theme.interface';
import { EmailHandler } from './email.handler';

test('send should call the provider method correctly', async () => {
  const provider: IEmailProvider = {
    id: 'email-provider',
    channelType: ChannelTypeEnum.EMAIL,
    sendMessage: () => Promise.resolve({ id: '1', date: new Date().toString() }),
  };

  const theme: ITheme = {
    branding: {
      logo: 'logo-url',
    },
    emailTemplate: new EmailTemplate('logo-url')
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

class EmailTemplate implements IEmailTemplate {
  constructor(private logo: string) {
  }

  getEmailLayout() {
    return `<div data-test-id="theme-layout-wrapper"><img src="${this.logo}"/>{{{body}}}</div>`
  }

  getTemplateVariables() {
    return {}
  }
}
