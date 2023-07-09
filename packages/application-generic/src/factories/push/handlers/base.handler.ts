import { IPushOptions, IPushProvider } from '@novu/stateless';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import {} from '@novu/dal';
import { IPushHandler } from '../interfaces';

export abstract class BasePushHandler implements IPushHandler {
  protected provider: IPushProvider;

  protected constructor(
    private providerId: string,
    private channelType: string
  ) {}

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  async send(options: IPushOptions) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error(
        'Currently 3rd-party packages test are not support on test env'
      );
    }

    return await this.provider.sendMessage(options);
  }

  abstract buildProvider(credentials: ICredentials);
}
