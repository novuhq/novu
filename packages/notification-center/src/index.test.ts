import {
  IStoreQuery,
  IUserPreferenceSettings,
  IPreferenceChannels,
  ScreensEnum,
  ColorScheme,
  IMessage,
  ChannelTypeEnum,
  IMessageCTA,
  IActor,
  ActorTypeEnum,
  ChannelCTATypeEnum,
  IMessageAction,
  MessageActionStatusEnum,
  IMessageButton,
  ButtonTypeEnum,
} from './index';

describe('@novu/notification-center - general export interface', () => {
  it('validate IStoreQuery interface', () => {
    const storeQuery: IStoreQuery = {
      feedIdentifier: 'abc123',
      seen: true,
      read: true,
    };

    expect(storeQuery.feedIdentifier).toBe('abc123');
    expect(storeQuery.seen).toBe(true);
    expect(storeQuery.read).toBe(true);
  });

  it('validate IUserPreferenceSettings interface', () => {
    const userPreferenceSettings: IUserPreferenceSettings = {
      template: { _id: 'test_id', name: 'test_name', critical: true },
      preference: {
        enabled: true,
        channels: {},
      },
    };

    expect(userPreferenceSettings.template._id).toBe('test_id');
    expect(userPreferenceSettings.template.name).toBe('test_name');
    expect(userPreferenceSettings.template.critical).toBe(true);
    expect(userPreferenceSettings.preference.enabled).toBe(true);
    expect(userPreferenceSettings.preference.channels).toStrictEqual({});
  });

  it('validate IPreferenceChannels interface', () => {
    const preferenceChannels: IPreferenceChannels = {
      email: true,
      sms: true,
      in_app: true,
      chat: true,
      push: true,
    };

    expect(preferenceChannels.email).toBe(true);
    expect(preferenceChannels.sms).toBe(true);
    expect(preferenceChannels.in_app).toBe(true);
    expect(preferenceChannels.chat).toBe(true);
    expect(preferenceChannels.push).toBe(true);
  });

  it('validate ScreensEnum interface', () => {
    const screensEnumNOTIFICATIONS: ScreensEnum = ScreensEnum.NOTIFICATIONS;
    const screensEnumSETTINGS: ScreensEnum = ScreensEnum.SETTINGS;

    expect(screensEnumNOTIFICATIONS).toBe('notifications');
    expect(screensEnumSETTINGS).toBe('settings');
  });

  it('validate ColorScheme interface', () => {
    const colorSchemeLight: ColorScheme = 'light';
    const colorSchemeDark: ColorScheme = 'dark';

    expect(colorSchemeLight).toBe('light');
    expect(colorSchemeDark).toBe('dark');
  });

  it('validate IMessage interface', () => {
    const message: IMessage = {
      _id: 'test_123',
      _templateId: 'test_123_template',
      _environmentId: 'test_123_environment',
      _organizationId: 'test_123_organization',
      _notificationId: 'test_123_notification',
      _subscriberId: 'test_123_subscriber',
      content: 'test_123_content',
      channel: {} as ChannelTypeEnum,
      seen: true,
      read: true,
      lastSeenDate: 'test_lastSeenDate',
      lastReadDate: 'test_lastReadDate',
      createdAt: 'test_createdAt',
      cta: {} as IMessageCTA,
      _feedId: 'test_feedId',
      payload: {},
      actor: {} as IActor,
    };

    expect(message._id).toBe('test_123');
    expect(message._templateId).toBe('test_123_template');
    expect(message._environmentId).toBe('test_123_environment');
    expect(message._organizationId).toBe('test_123_organization');
    expect(message._notificationId).toBe('test_123_notification');
    expect(message._subscriberId).toBe('test_123_subscriber');
    expect(message.content).toBe('test_123_content');
    expect(message.channel).toStrictEqual({});
    expect(message.seen).toBe(true);
    expect(message.read).toBe(true);
    expect(message.lastSeenDate).toBe('test_lastSeenDate');
    expect(message.lastReadDate).toBe('test_lastReadDate');
    expect(message.createdAt).toBe('test_createdAt');
    expect(message.cta).toStrictEqual({});
    expect(message._feedId).toBe('test_feedId');
    expect(message.payload).toStrictEqual({});
    expect(message.actor).toStrictEqual({});
  });

  it('validate ChannelTypeEnum interface', () => {
    const channelTypeEnumInApp: ChannelTypeEnum = ChannelTypeEnum.IN_APP;
    const channelTypeEnumEmail: ChannelTypeEnum = ChannelTypeEnum.EMAIL;
    const channelTypeEnumSms: ChannelTypeEnum = ChannelTypeEnum.SMS;
    const channelTypeEnumChat: ChannelTypeEnum = ChannelTypeEnum.CHAT;
    const channelTypeEnumPush: ChannelTypeEnum = ChannelTypeEnum.PUSH;

    expect(channelTypeEnumInApp).toBe('in_app');
    expect(channelTypeEnumEmail).toBe('email');
    expect(channelTypeEnumSms).toBe('sms');
    expect(channelTypeEnumChat).toBe('chat');
    expect(channelTypeEnumPush).toBe('push');
  });

  it('validate IActor interface', () => {
    const actor: IActor = {
      type: 'none' as ActorTypeEnum,
      data: 'data_test',
    };

    expect(actor.type).toBe('none');
    expect(actor.data).toBe('data_test');
  });

  it('validate ActorTypeEnum interface', () => {
    const actorTypeEnumNone: ActorTypeEnum = ActorTypeEnum.NONE;
    const actorTypeEnumUser: ActorTypeEnum = ActorTypeEnum.USER;
    const actorTypeEnumSystemIcon: ActorTypeEnum = ActorTypeEnum.SYSTEM_ICON;
    const actorTypeEnumSystemCustom: ActorTypeEnum = ActorTypeEnum.SYSTEM_CUSTOM;

    expect(actorTypeEnumNone).toBe('none');
    expect(actorTypeEnumUser).toBe('user');
    expect(actorTypeEnumSystemIcon).toBe('system_icon');
    expect(actorTypeEnumSystemCustom).toBe('system_custom');
  });

  it('validate IMessageCTA interface', () => {
    const channelCTATypeEnum: ChannelCTATypeEnum = ChannelCTATypeEnum.REDIRECT;

    const messageCTA: IMessageCTA = {
      type: channelCTATypeEnum,
      data: {
        url: 'data_url',
      },
      action: {} as IMessageAction,
    };

    expect(messageCTA.type).toBe('redirect');
    expect(messageCTA.data.url).toBe('data_url');
    expect(messageCTA.action).toStrictEqual({});
  });

  it('validate IMessageAction interface', () => {
    const messageAction: IMessageAction = {
      status: 'pending' as MessageActionStatusEnum,
      buttons: [] as IMessageButton[],
      result: {
        payload: {},
        type: 'primary' as ButtonTypeEnum,
      },
    };

    expect(messageAction.status).toBe('pending');
    expect(messageAction.buttons).toStrictEqual([]);
    expect(messageAction.result.payload).toStrictEqual({});
    expect(messageAction.result.type).toBe('primary');
  });

  it('validate MessageActionStatusEnum interface', () => {
    const messageActionStatusEnumDone: MessageActionStatusEnum = MessageActionStatusEnum.DONE;
    const messageActionStatusEnumPending: MessageActionStatusEnum = MessageActionStatusEnum.PENDING;

    expect(messageActionStatusEnumDone).toBe('done');
    expect(messageActionStatusEnumPending).toBe('pending');
  });

  it('validate IMessageButton interface', () => {
    const messageButton: IMessageButton = {
      type: ButtonTypeEnum.PRIMARY,
      content: 'test_content',
      resultContent: 'test_resultContent',
    };

    expect(messageButton.type).toBe('primary');
    expect(messageButton.content).toBe('test_content');
    expect(messageButton.resultContent).toBe('test_resultContent');
  });

  it('validate ButtonTypeEnum interface', () => {
    const buttonTypeEnumPrimary: ButtonTypeEnum = ButtonTypeEnum.PRIMARY;
    const buttonTypeEnumSecondary: ButtonTypeEnum = ButtonTypeEnum.SECONDARY;
    const buttonTypeEnumClicked: ButtonTypeEnum = ButtonTypeEnum.CLICKED;

    expect(buttonTypeEnumPrimary).toBe('primary');
    expect(buttonTypeEnumSecondary).toBe('secondary');
    expect(buttonTypeEnumClicked).toBe('clicked');
  });
});
