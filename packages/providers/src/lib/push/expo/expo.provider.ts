import { PushProviderIdEnum } from '@novu/shared';
import { IPushOptions, IPushProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { PushBaseProvider } from '../push.base-provider';

export class ExpoPushProvider extends PushBaseProvider implements IPushProvider {
  id = PushProviderIdEnum.EXPO;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  private readonly INVALID_TOKEN_ERRORS = ['not a valid Expo push token'];

  private expo: Expo;
  constructor(
    private config: {
      accessToken: string;
    }
  ) {
    super();
    this.expo = new Expo({ accessToken: this.config.accessToken });
  }

  isTokenInvalid(errorMessage: string): boolean {
    return this.INVALID_TOKEN_ERRORS.some((error) => errorMessage?.includes(error));
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { sound, badge, ...overrides } = options.overrides ?? {};

    const tickets: ExpoPushTicket[] = await this.expo.sendPushNotificationsAsync([
      this.transform<ExpoPushMessage>(bridgeProviderData, {
        to: options.target,
        title: options.title,
        body: options.content,
        data: options.payload,
        badge: badge as unknown as number,
        sound: typeof sound === 'string' ? (sound as ExpoPushMessage['sound']) : null,
        ...overrides,
      }).body,
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
