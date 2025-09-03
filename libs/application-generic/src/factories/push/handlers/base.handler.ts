import {} from '@novu/dal';
import { ChannelTypeEnum, ICredentials, PushProviderIdEnum } from '@novu/shared';
import { IPushOptions, IPushProvider } from '@novu/stateless';
import { BaseHandler } from '../../shared/interfaces';
import { IPushHandler } from '../interfaces';

export abstract class BasePushHandler extends BaseHandler implements IPushHandler {
  protected provider: IPushProvider;

  protected constructor(
    private providerId: PushProviderIdEnum,
    private channelType: string
  ) {
    super();
  }

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  async send(options: IPushOptions) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('Currently 3rd-party packages test are not support on test env');
    }

    const { bridgeProviderData, ...otherOptions } = options;

    return await this.provider.sendMessage(otherOptions, bridgeProviderData);
  }

  abstract buildProvider(credentials: ICredentials);
}
