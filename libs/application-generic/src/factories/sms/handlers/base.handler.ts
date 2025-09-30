import { ICredentials, SmsProviderIdEnum } from '@novu/shared';
import { ISmsOptions, ISmsProvider } from '@novu/stateless';
import { BaseHandler } from '../../shared/interfaces';
import { ISmsHandler } from '../interfaces';

export abstract class BaseSmsHandler extends BaseHandler<ISmsProvider> implements ISmsHandler {
  protected provider: ISmsProvider;

  protected constructor(providerId: SmsProviderIdEnum, channelType: string) {
    super(providerId, channelType);
  }

  public getProvider(): ISmsProvider {
    return this.provider;
  }

  async send(options: ISmsOptions) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('Currently 3rd-party packages test are not support on test env');
    }

    const { bridgeProviderData, ...otherOptions } = options;

    return await this.provider.sendMessage(otherOptions, bridgeProviderData);
  }

  abstract buildProvider(credentials: ICredentials);
}
