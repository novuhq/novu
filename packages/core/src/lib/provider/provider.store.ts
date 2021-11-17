import { ChannelTypeEnum } from '../template/template.interface';

import {
  IEmailProvider,
  ISmsProvider,
  IDirectProvider,
} from './provider.interface';

export class ProviderStore {
  private providers: Array<ISmsProvider | IEmailProvider | IDirectProvider> =
    [];

  async addProvider(provider: IEmailProvider | ISmsProvider | IDirectProvider) {
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
