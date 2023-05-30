import {
  ChannelTypeEnum,
  IPushOptions,
  IPushProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import * as OneSignal from 'onesignal-node';

export class OneSignalPushProvider implements IPushProvider {
  id = 'one-signal';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private oneSignal: OneSignal.Client;
  constructor(
    private config: {
      appId: string;
      apiKey: string;
    }
  ) {
    this.oneSignal = new OneSignal.Client(
      this.config.appId,
      this.config.apiKey
    );
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};

    const res = await this.oneSignal.createNotification({
   const { externalUserIds } =  overrides['one-signal'] || {};
   const res = await this.oneSignal.createNotification({ 
      ...(externalUserIds !== undefined
        ? {
            include_external_user_ids: externalUserIds,
            channel_for_external_user_ids: 'push',
          }
        : { include_player_ids: options.target }),
      headings: { en: options.title },
      contents: { en: options.content },
      subtitle: { en: overrides.subtitle },
      data: options.payload,
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      ios_sound: sound,
      android_sound: sound,
      mutable_content: overrides.mutableContent,
      android_channel_id: overrides.channelId,
      small_icon: overrides.icon,
      large_icon: overrides.icon,
      chrome_icon: overrides.icon,
      firefox_icon: overrides.icon,
      ios_category: overrides.categoryId,
      ttl: overrides.ttl,
    });

    return {
      id: res.body.id,
      date: new Date().toISOString(),
    };
  }
}
