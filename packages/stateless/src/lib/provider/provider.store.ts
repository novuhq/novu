import { ChannelTypeEnum } from '../template/template.interface';

import { IChatProvider, IEmailProvider, IPushProvider, ISignalsProvider, ISmsProvider } from './provider.interface';

type RegisterableProvider = IEmailProvider | ISmsProvider | IChatProvider | IPushProvider | ISignalsProvider;

export class ProviderStore {
  private providers: {
    [key: string]: RegisterableProvider;
  } = {};

  async addProvider(providerId: string, provider: RegisterableProvider) {
    this.providers[providerId] = provider;
  }

  async getProviderById(providerId: string) {
    return this.providers[providerId];
  }

  async getProviderByInternalId(providerId: string) {
    return (await this.getProviders()).find((provider) => provider.id === providerId);
  }

  async getProviderByChannel(channel: ChannelTypeEnum) {
    return (await this.getProviders()).find((provider) => provider.channelType === channel);
  }

  async getProviders() {
    return Object.values(this.providers);
  }
}
