import { ChannelTypeEnum } from '../template/template.interface';

import { IEmailProvider, ISmsProvider } from './provider.interface';

export class ProviderStore {
  private providers: Array<ISmsProvider | IEmailProvider> = [];

  async addProvider(provider: IEmailProvider | ISmsProvider) {
    this.providers.push(provider);
  }

  async getProviderById(providerId: string) {
    return this.providers.find((provider) => provider.id === providerId);
  }

  async getProviderByChannel(channel: ChannelTypeEnum) {
    return this.providers.find((provider) => provider.channelType === channel);
  }

  async getProviders() {
    return this.providers;
  }
}
