import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { Infobip, AuthType } from '@infobip-api/sdk';

export class InfobipSmsProvider implements ISmsProvider {
  id = 'infobip';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;

  private infobipClient;

  constructor(
    private config: {
      baseUrl: string;
      apiKey: string;
      from?: string;
    }
  ) {
    this.infobipClient = new Infobip({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      authType: AuthType.ApiKey,
    });
  }

  async sendMessage(
    options: ISmsOptions
  ): Promise<ISendMessageSuccessResponse> {
    const infobipResponse = await this.infobipClient.channels.sms.send({
      messages: [
        {
          text: options.content,
          destinations: {
            to: options.to,
          },
          from: this.config.from || options.from,
        },
      ],
    });

    return {
      id: infobipResponse.bulkId,
      date: new Date().toISOString(),
    };
  }
}
