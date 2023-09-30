import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import { Expo, ExpoPushMessage, ExpoPushSuccessTicket } from 'expo-server-sdk';

export class ExpoPushProvider implements IPushProvider {
  id = 'expo';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private expo: Expo;
  constructor(
    private config: {
      accessToken: string;
    }
  ) {
    this.expo = new Expo({ accessToken: this.config.accessToken });
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};

    const res = await this.expo.sendPushNotificationsAsync([
      {
        to: options.target,
        title: options.title,
        body: options.content,
        data: options.payload,
        badge: badge as unknown as number,
        sound:
          typeof sound === 'string'
            ? (sound as ExpoPushMessage['sound'])
            : null,
        ...overrides,
      },
    ]);

    return {
      id: (res[0] as ExpoPushSuccessTicket).id,
      date: new Date().toISOString(),
    };
  }
}
