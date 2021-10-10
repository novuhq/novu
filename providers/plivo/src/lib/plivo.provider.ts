import { ChannelTypeEnum, ISmsOptions, ISmsProvider } from '@notifire/core';

import * as plivo from 'plivo';

export class PlivoSmsProvider implements ISmsProvider {
  id = 'plivo';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private plivoClient: plivo.Client;

  constructor(
    private config: {
      accountSid: string;
      authToken: string;
      from: string;
    }
  ) {
    this.plivoClient = new plivo.Client(config.accountSid, config.authToken);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(options: ISmsOptions): Promise<any> {
    return await this.plivoClient.messages.create(
      this.config.from,
      options.to,
      options.content
    );
  }
}
