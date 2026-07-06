import { assertAllowedSinchSmsRegion, SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';

import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class SinchSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Sinch;
  protected casing = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  private readonly region: ReturnType<typeof assertAllowedSinchSmsRegion>;

  constructor(
    private config: {
      servicePlanId?: string;
      apiToken?: string;
      from?: string;
      region?: string;
    }
  ) {
    super();
    this.region = assertAllowedSinchSmsRegion(this.config.region);
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const url = `https://${this.region}.sms.api.sinch.com/xms/v1/${this.config.servicePlanId}/batches`;

    const payload = this.transform<Record<string, unknown>>(bridgeProviderData, {
      from: options.from || this.config.from,
      to: [options.to],
      body: options.content,
    }).body;

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiToken}`,
      },
    });

    return {
      id: response.data.id,
      date: response.data.created_at || new Date().toISOString(),
    };
  }
}
