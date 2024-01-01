import { IVoiceOptions, IVoiceProvider } from '@novu/stateless';
import { ChannelTypeEnum, ICredentials } from '@novu/shared';
import { IVoiceHandler } from '../interfaces';

export abstract class BaseVoiceHandler implements IVoiceHandler {
  protected provider: IVoiceProvider;

  protected constructor(
    private providerId: string,
    private channelType: string
  ) {}

  getProvider(): IVoiceProvider {
    return this.provider;
  }

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  async send(options: IVoiceOptions) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error(
        'Currently 3rd-party packages test are not support on test env'
      );
    }

    return await this.provider.sendMessage(options);
  }

  abstract buildProvider(credentials: ICredentials);
}
