import { ChannelTypeEnum } from '../template/template.interface';

import {
  IEmailProvider,
  ISmsProvider,
  IDirectProvider,
} from './provider.interface';

export class ProviderStore {
  private providers: {
    [key: string]: ISmsProvider | IEmailProvider | IDirectProvider;
  } = {};

  async addProvider(
    providerId: string,
    provider: IEmailProvider | ISmsProvider | IDirectProvider
  ) {
    this.providers[providerId] = provider;
  }

  async getProviderById(providerId: string) {
    return this.providers[providerId];
  }

  async getProviderByInternalId(providerId: string) {
    return (await this.getProviders()).find(
      (provider) => provider.id === providerId
    );
  }

  async getProviderByChannel(channel: ChannelTypeEnum) {
    return (await this.getProviders()).find(
      (provider) => provider.channelType === channel
    );
  }

  async getProviders() {
    return Object.values(this.providers);
  }
}
