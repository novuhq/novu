import { IEmailOptions, IEmailProvider } from '@notifire/core';
import { ChannelTypeEnum } from '@notifire/shared';
import { IMailHandler } from '../interfaces/send.handler.interface';

export abstract class BaseHandler implements IMailHandler {
  protected readonly providerId;
  protected readonly channelType;
  protected provider: IEmailProvider;

  protected constructor(providerId: string, channelType: string) {
    this.providerId = providerId;
    this.channelType = channelType;
  }

  canHandle(providerId: string, channelType: ChannelTypeEnum) {
    return providerId === this.providerId && channelType === this.channelType;
  }

  abstract buildProvider(credentials, options);

  async send(mailData: IEmailOptions) {
    await this.provider.sendMessage(mailData);
  }
}
