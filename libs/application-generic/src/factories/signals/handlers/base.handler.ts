import { ICredentials, SignalsProviderIdEnum } from '@novu/shared';
import { ISignalsOptions, ISignalsProvider } from '@novu/stateless';
import { BaseHandler } from '../../shared/interfaces';
import { ISignalsHandler } from '../interfaces';

export abstract class BaseSignalsHandler extends BaseHandler<ISignalsProvider> implements ISignalsHandler {
  protected provider: ISignalsProvider;

  protected constructor(providerId: SignalsProviderIdEnum, channelType: string) {
    super(providerId, channelType);
  }

  async send(options: ISignalsOptions) {
    if (process.env.NODE_ENV === 'test') {
      return {};
    }

    const { bridgeProviderData, ...otherOptions } = options;

    return await this.provider.sendMessage(otherOptions, bridgeProviderData);
  }

  abstract buildProvider(credentials: ICredentials);
}
