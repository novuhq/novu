import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { SDK } from '@ringcentral/sdk';

export class RingcentralSmsProvider implements ISmsProvider {
  id = 'ringcentral';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private ringcentralClient: SDK;

  constructor(
    private config: {
      server: string;
      clientId: string;
      clientSecret: string;
      from?: string;
    }
  ) {
    this.ringcentralClient = new SDK({
      server: config.server,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const ringcentralResponse = await this.ringcentralClient
      .platform()
      .post('/restapi/v1.0/account/~/extension/~/sms', {
        from: this.config.from,
        to: options.to,
        text: options.content,
      });

    return {
      id: ringcentralResponse.id,
      date: ringcentralResponse.creationTime.toISOString(),
    };
  }
}
