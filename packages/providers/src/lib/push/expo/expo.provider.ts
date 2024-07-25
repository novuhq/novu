import { PushProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { BaseProvider } from '../../../base.provider';

export class ExpoPushProvider extends BaseProvider implements IPushProvider {
  id = PushProviderIdEnum.EXPO;
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  private expo: Expo;
  constructor(
    private config: {
      accessToken: string;
    }
  ) {
    super();
    this.expo = new Expo({ accessToken: this.config.accessToken });
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};

    const tickets: ExpoPushTicket[] =
      await this.expo.sendPushNotificationsAsync([
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
          ...this.transform(bridgeProviderData).body,
        },
      ]);

    /*
     * TODO: We now just send one device token from Novu.
     * We need a different method to handle multiple ones.
     */
    const [ticket] = tickets;

    if (ticket.status === 'error') {
      throw new Error(ticket.message);
    }

    if (ticket.status === 'ok') {
      return {
        id: ticket.id,
        // Expo doesn't return a timestamp in the response
        date: new Date().toISOString(),
      };
    }

    throw new Error('Unexpected Expo status');
  }
}
