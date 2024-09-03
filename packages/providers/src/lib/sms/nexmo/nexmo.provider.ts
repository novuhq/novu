import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';

import { Vonage } from '@vonage/server-sdk';
import { Auth } from '@vonage/auth';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class NexmoSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Nexmo;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private vonageClient: Vonage;
  protected casing = CasingEnum.CAMEL_CASE;

  constructor(
    private config: {
      apiKey: string;
      apiSecret: string;
      from: string;
    },
  ) {
    super();
    this.vonageClient = new Vonage(
      new Auth({
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
      }),
    );
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const response = await this.vonageClient.sms.send(
      this.transform<any>(bridgeProviderData, {
        to: options.to,
        from: this.config.from,
        text: options.content,
      }).body,
    );

    return {
      id: response.messages[0]['message-id'],
      date: new Date().toISOString(),
    };
  }
}
