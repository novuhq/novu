import { ICredentials, PushProviderIdEnum } from '@novu/shared';
import { IPushOptions, IPushProvider } from '@novu/stateless';
import { BaseHandler } from '../../shared/interfaces';
import { IPushHandler } from '../interfaces';

export abstract class BasePushHandler extends BaseHandler<IPushProvider> implements IPushHandler {
  protected provider: IPushProvider;

  protected constructor(providerId: PushProviderIdEnum, channelType: string) {
    super(providerId, channelType);
  }

  async send(options: IPushOptions) {
    if (process.env.NODE_ENV === 'test') {
      return {};
    }

    const { bridgeProviderData, ...otherOptions } = options;

    return await this.provider.sendMessage(otherOptions, bridgeProviderData);
  }

  abstract buildProvider(credentials: ICredentials);
}
