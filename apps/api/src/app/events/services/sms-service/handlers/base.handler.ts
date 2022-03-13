import { ISmsOptions, ISmsProvider } from '@notifire/core';
import { ChannelTypeEnum } from '@notifire/shared';
import { ICredentials } from '@notifire/dal';
import { ISmsHandler } from '../interfaces';

export abstract class BaseSmsHandler implements ISmsHandler {
  protected readonly providerId;
  protected readonly channelType;
  protected provider: ISmsProvider;

  protected constructor(providerId: string, channelType: string) {
    this.providerId = providerId;
    this.channelType = channelType;
  }

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  async send(options: ISmsOptions) {
    await this.provider.sendMessage(options);
  }

  abstract buildProvider(credentials: ICredentials, from: string);
}
