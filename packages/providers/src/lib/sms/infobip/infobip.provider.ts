import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import { Infobip, AuthType } from '@infobip-api/sdk';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider } from '../../../base.provider';

export class InfobipSmsProvider extends BaseProvider implements ISmsProvider {
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  id = SmsProviderIdEnum.Infobip;

  private infobipClient;

  constructor(
    private config: {
      baseUrl?: string;
      apiKey?: string;
      from?: string;
    }
  ) {
    super();
    this.infobipClient = new Infobip({
      baseUrl: this.config.baseUrl,
      apiKey: this.config.apiKey,
      authType: AuthType.ApiKey,
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const infobipResponse = await this.infobipClient.channels.sms.send({
      messages: [
        this.transform(bridgeProviderData, {
          text: options.content,
          destinations: [
            {
              to: options.to,
            },
          ],
          from: options.from || this.config.from,
        }).body,
      ],
    });
    const { messageId } = infobipResponse.data.messages.pop();

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}
