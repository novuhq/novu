import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

interface ITextLkResponse {
  status?: string;
  message?: string;
  data?: {
    uid?: string;
    status?: string;
    cost?: string;
  };
}

export class TextLkSmsProvider extends BaseProvider implements ISmsProvider {
  public static readonly BASE_URL = 'https://app.text.lk/api/v3/sms/send';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;
  id = SmsProviderIdEnum.TextLk;

  constructor(
    private config: {
      apiKey?: string;
      from?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, {
      recipient: options.to,
      sender_id: options.from || this.config.from,
      type: 'plain',
      message: options.content,
    });

    const response = await fetch(TextLkSmsProvider.BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...data.headers,
      },
      body: JSON.stringify(data.body),
    });

    const body = (await response.json()) as ITextLkResponse;

    if (!response.ok || body.status !== 'success' || !body.data?.uid) {
      throw new Error(`Text.lk SMS error: ${body.message || `request failed with status ${response.status}`}`);
    }

    return {
      id: body.data.uid,
      date: new Date().toISOString(),
    };
  }
}
