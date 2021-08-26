import { ChannelTypeEnum } from '../template/template.interface';

import { IEmailProvider, ISmsProvider } from './provider.interface';

export class ProviderStore {
  private providers: Array<ISmsProvider | IEmailProvider> = [];

  addProvider(provider: IEmailProvider | ISmsProvider) {
    this.providers.push(provider);
  }

  getProviderById(providerId: string) {
    return this.providers.find((provider) => provider.id === providerId);
  }

  getProviderByChannel(channel: ChannelTypeEnum) {
    return this.providers.find((provider) => provider.channelType === channel);
  }
}
