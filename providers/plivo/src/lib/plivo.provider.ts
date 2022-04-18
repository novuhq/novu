import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

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

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const plivoResponse = await this.plivoClient.messages.create(
      this.config.from,
      options.to,
      options.content
    );

    return {
      id: plivoResponse.apiId,
      date: new Date().toISOString(),
    };
  }
}
