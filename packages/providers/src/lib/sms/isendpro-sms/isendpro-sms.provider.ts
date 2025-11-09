import { SmsProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ISmsOptions,
  ISmsProvider,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

// Define payload type to ensure TypeScript knows the structure
interface ISendProPayload {
  body: {
    message: {
      text: string;
      to: string;
    };
  };
  headers?: Record<string, string>;
}

export class ISendProSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.ISendProSms;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;

  public readonly DEFAULT_BASE_URL = 'https://apirest.isendpro.com/cgi-bin';

  constructor(
    private config: {
      apiKey: string;
      from?: string; // optional, custom sender
    }
  ) {
    super();
  }

  /**
   * Send SMS message via iSendPro
   * @param options ISmsOptions from Novu
   * @param bridgeProviderData Optional passthrough data
   * @returns ISendMessageSuccessResponse
   */
  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    // Transform Novu payload into iSendPro payload
    const payload = this.transform(bridgeProviderData, {
      message: {
        to: options.to,
        text: options.content,
      },
    }) as ISendProPayload;

    // Build query params for iSendPro
    const params = new URLSearchParams();
    params.append('keyid', this.config.apiKey);
    params.append('sms', payload.body.message.text);
    params.append('num', payload.body.message.to.replace(/^\+|^00/, ''));
    params.append('emetteur', this.config.from || 'NOVU');


    // Send the SMS via iSendPro API
    const response = await axios.post(`${this.DEFAULT_BASE_URL}/sms`, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...payload.headers,
      }
    });


    // Return standardized response for Novu
    return {
      id: response.data?.id || 'id_returned_by_provider',
      date: new Date().toISOString(),
    };
  }
}
