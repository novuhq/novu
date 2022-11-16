import { EventEmitter } from 'events';
import { HandlebarsContentEngine } from '../content/content.engine';
import { EmailHandler } from '../handler/email.handler';
import { CheckIntegrationResponseEnum } from '../provider/provider.enum';
import { ProviderStore } from '../provider/provider.store';
import { ChannelTypeEnum } from '../template/template.interface';
import { TemplateStore } from '../template/template.store';
import { ThemeStore } from '../theme/theme.store';
import { TriggerEngine } from './trigger.engine';

test('emailHandler should be called correctly', async () => {
  const templateStore = new TemplateStore();
  const providerStore = new ProviderStore();
  const themeStore = new ThemeStore();
  const contentEngine = new HandlebarsContentEngine();
  const ee = new EventEmitter();

  await providerStore.addProvider('email', {
    channelType: ChannelTypeEnum.EMAIL,
    id: 'email-provider',
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
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

  const triggerEngine = new TriggerEngine(
    templateStore,
    providerStore,
    themeStore,
    contentEngine,
    {},
    ee
  );

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

test('variable protection should throw if missing variable provided', async () => {
  const templateStore = new TemplateStore();
  const providerStore = new ProviderStore();
  const themeStore = new ThemeStore();
  const ee = new EventEmitter();
  const contentEngine = new HandlebarsContentEngine();

  const triggerEngine = new TriggerEngine(
    templateStore,
    providerStore,
    themeStore,
    contentEngine,
    {
      variableProtection: true,
    },
    ee
  );

  await providerStore.addProvider('email', {
    channelType: ChannelTypeEnum.EMAIL,
    id: 'email-provider',
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
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

  await expect(
    triggerEngine.trigger('test-notification', {
      $user_id: '12345',
      $email: 'test@gmail.com',
    })
  ).rejects.toEqual(new Error('Missing variables passed. firstName'));
});

test('variable protection should throw if missing variable provided with template method', async () => {
  const templateStore = new TemplateStore();
  const providerStore = new ProviderStore();
  const themeStore = new ThemeStore();
  const ee = new EventEmitter();
  const contentEngine = new HandlebarsContentEngine();

  const triggerEngine = new TriggerEngine(
    templateStore,
    providerStore,
    themeStore,
    contentEngine,
    {
      variableProtection: true,
    },
    ee
  );

  await providerStore.addProvider('email', {
    channelType: ChannelTypeEnum.EMAIL,
    id: 'email-provider',
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
  });

  await templateStore.addTemplate({
    id: 'test-notification-promise',
    messages: [
      {
        subject: '<div>{{firstName}}</div>',
        channel: ChannelTypeEnum.EMAIL,
        template: () => Promise.resolve('test'),
      },
    ],
  });

  await expect(
    triggerEngine.trigger('test-notification-promise', {
      $user_id: '12345',
      $email: 'test@gmail.com',
    })
  ).rejects.toEqual(new Error('Missing variables passed. firstName'));
});

test('TriggerEngine should call validate if validator is provided', async () => {
  const templateStore = new TemplateStore();
  const providerStore = new ProviderStore();
  const themeStore = new ThemeStore();
  const ee = new EventEmitter();
  const contentEngine = new HandlebarsContentEngine();

  await providerStore.addProvider('email', {
    channelType: ChannelTypeEnum.EMAIL,
    id: 'email-provider',
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
  });

  const validate = jest.fn().mockImplementation(() => true);

  await templateStore.addTemplate({
    id: 'test-notification',
    messages: [
      {
        subject: 'test',
        channel: ChannelTypeEnum.EMAIL,
        template: '<div>{{firstName}}</div>',
        validator: {
          validate,
        },
      },
    ],
  });

  const triggerEngine = new TriggerEngine(
    templateStore,
    providerStore,
    themeStore,
    contentEngine,
    {},
    ee
  );

  await triggerEngine.trigger('test-notification', {
    $user_id: '12345',
    $email: 'test@gmail.com',
  });

  expect(validate).toBeCalled();
  expect(validate).toBeCalledWith({
    $email: 'test@gmail.com',
    $user_id: '12345',
  });
});

test('Validation should throw error if validate method returns false', async () => {
  const templateStore = new TemplateStore();
  const providerStore = new ProviderStore();
  const themeStore = new ThemeStore();
  const ee = new EventEmitter();
  const contentEngine = new HandlebarsContentEngine();

  await providerStore.addProvider('email', {
    channelType: ChannelTypeEnum.EMAIL,
    id: 'email-provider',
    sendMessage: () =>
      Promise.resolve({ id: '1', date: new Date().toString() }),
    checkIntegration: () =>
      Promise.resolve({
        message: 'test',
        success: true,
        code: CheckIntegrationResponseEnum.SUCCESS,
      }),
  });

  await templateStore.addTemplate({
    id: 'test-notification',
    messages: [
      {
        subject: 'test',
        channel: ChannelTypeEnum.EMAIL,
        template: '<div>{{firstName}}</div>',
        validator: {
          validate: () => Promise.resolve(false),
        },
      },
    ],
  });

  const triggerEngine = new TriggerEngine(
    templateStore,
    providerStore,
    themeStore,
    contentEngine,
    {},
    ee
  );

  await expect(
    triggerEngine.trigger('test-notification', {
      $user_id: '12345',
      $email: 'test@gmail.com',
    })
  ).rejects.toEqual(new Error('Payload for email is invalid'));
});
