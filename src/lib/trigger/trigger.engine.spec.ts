import { EmailHandler } from '../handler/email.handler';
import { ProviderStore } from '../provider/provider.store';
import { ChannelTypeEnum } from '../template/template.interface';
import { TemplateStore } from '../template/template.store';
import { TriggerEngine } from './trigger.engine';

test('emailHandler should be called correctly', async () => {
  const templateStore = new TemplateStore();
  const providerStore = new ProviderStore();

  await providerStore.addProvider({
    channelType: ChannelTypeEnum.EMAIL,
    id: 'email-provider',
    sendMessage: () => null,
  });

  await templateStore.addTemplate({
    id: 'test-notification',
    messages: [
      {
        subject: 'test',
        channel: ChannelTypeEnum.EMAIL,
        template: '<div>{{firstName}}</div>',
      },
    ],
  });

  const triggerEngine = new TriggerEngine(templateStore, providerStore);

  const emailSpy = jest.spyOn(EmailHandler.prototype, 'send');
  await triggerEngine.trigger('test-notification', {
    $user_id: '12345',
    $email: 'test@gmail.com',
  });

  expect(emailSpy).toHaveBeenCalledWith({
    $email: 'test@gmail.com',
    $user_id: '12345',
  });
});
