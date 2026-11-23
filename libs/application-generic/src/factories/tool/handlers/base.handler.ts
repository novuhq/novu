import { ICredentials, ToolProviderIdEnum } from '@novu/shared';
import { IToolOptions, IToolProvider } from '@novu/stateless';
import { env } from '../../../config/env';
import { BaseHandler } from '../../shared/interfaces';
import { IToolHandler } from '../interfaces';

export abstract class BaseToolHandler extends BaseHandler<IToolProvider> implements IToolHandler {
  protected provider: IToolProvider;

  protected constructor(providerId: ToolProviderIdEnum, channelType: string) {
    super(providerId, channelType);
  }

  async send(options: IToolOptions) {
    if (env.NODE_ENV === 'test') {
      return {};
    }

    const { bridgeProviderData, ...otherOptions } = options;

    return await this.provider.sendMessage(otherOptions, bridgeProviderData);
  }

  abstract buildProvider(credentials: ICredentials);
}
