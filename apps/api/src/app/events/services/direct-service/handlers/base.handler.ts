import { IDirectOptions, IDirectProvider } from '@novu/stateless';
import { ChannelTypeEnum } from '@novu/shared';
import { IDirectHandler } from '../interfaces';

export abstract class BaseDirectHandler implements IDirectHandler {
  protected provider: IDirectProvider;

  protected constructor(private providerId: string, private channelType: string) {}

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  abstract buildProvider(credentials);

  abstract setSubscriberCredentials(credentials);

  async send(directContent: IDirectOptions) {
    if (process.env.NODE_ENV === 'test') {
      return null;
    }

    return await this.provider.sendMessage(directContent);
  }
}
