import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import * as OneSignal from '@onesignal/node-onesignal';

export class OneSignalPushProvider implements IPushProvider {
  id = 'one-signal';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;
  private configuration: OneSignal.Configuration;

  private oneSignal: OneSignal.DefaultApi;
  constructor(
    private config: {
      appId: string;
      appKey: string;
      userKey: string;
    }
  ) {
    this.configuration = OneSignal.createConfiguration({
      appKey: this.config.appKey,
      userKey: this.config.userKey,
    });
    this.oneSignal = new OneSignal.DefaultApi(this.configuration);
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};

    const notification: OneSignal.Notification = {
      include_player_ids: options.target,
      app_id: this.config.appId,
      headings: { en: options.title },
      contents: { en: options.content },
      subtitle: { en: overrides.subtitle },
      data: options.payload,
      ios_badge_type: 'Increase',
      ios_badge_count: 1,
      ios_sound: sound,
      android_sound: sound,
      mutable_content: overrides.mutableContent,
      android_channel_id: overrides.channelId,
      small_icon: overrides.icon,
      large_icon: overrides.icon,
      chrome_icon: overrides.icon,
      firefox_icon: overrides.icon,
      ios_category: overrides.categoryId,
    };

    const res = await this.oneSignal.createNotification(notification);

    return {
      id: res.id,
      date: new Date().toISOString(),
    };
  }
}
