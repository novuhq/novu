import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';

export class RuachSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.RuachSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.PASCAL_CASE;
  private readonly BASE_URL = 'https://app.notify.ng/api/v2/SendSMS';
  private readonly httpClient = createProviderHttpClient();

  constructor(
    private config: {
      apiKey?: string;
      clientId?: string;
      from?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      SenderId: options.from || this.config.from,
      Message: options.content,
      MobileNumbers: options.to.replace(/^\+/, ''),
      ApiKey: this.config.apiKey,
      ClientId: this.config.clientId,
      Is_Unicode: false,
      Is_Flash: false,
    });

    const { data } = await this.httpClient.post(this.BASE_URL, payload.body, {
      headers: {
        'Content-Type': 'application/json',
        ...payload.headers,
      },
    });

    // Ruach may encode ErrorCode as a number (0) or a string ("0"), so normalize before comparing.
    if (String(data?.ErrorCode) !== '0') {
      throw new Error(`Ruach SMS request failed (${data?.ErrorCode}): ${data?.ErrorDescription}`);
    }

    return {
      id: data.Data?.[0]?.MessageId,
      date: new Date().toISOString(),
    };
  }
}
