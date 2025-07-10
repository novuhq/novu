import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { SmsProviderIdEnum } from '@novu/shared';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class TnzSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Tnz;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing: CasingEnum = CasingEnum.PASCAL_CASE;
  private readonly BASE_URL = 'https://api.tnz.co.nz/api/v2.04/send/';
  private axiosInstance: AxiosInstance;

  constructor(
    private config: {
      authToken: string;
    }
  ) {
    super();

    // Handle auth token format - accept either just the token or full "Basic TOKEN" format
    const authToken = this.config.authToken.startsWith('Basic ')
      ? this.config.authToken
      : `Basic ${this.config.authToken}`;

    this.axiosInstance = axios.create({
      baseURL: this.BASE_URL,
      headers: {
        'Content-Type': "application/json; encoding='utf-8'",
        Accept: "application/json; encoding='utf-8'",
        Authorization: authToken,
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const { to, content, customData } = options;

    const destination = { Recipient: to };
    const messageData = {
      Message: content,
      Destinations: [destination],
    };

    // Add optional TNZ fields if provided in customData
    if (customData) {
      const optionalFields = [
        'MessageID',
        'Reference',
        'WebhookCallbackURL',
        'WebhookCallbackFormat',
        'SendTime',
        'TimeZone',
        'SubAccount',
        'Department',
        'ChargeCode',
        'FromNumber',
        'SMSEmailReply',
        'CharacterConversion',
        'Files',
      ];

      for (const field of optionalFields) {
        if (customData[field] !== undefined) {
          messageData[field] = customData[field];
        }
      }
    }

    const payload = { MessageData: messageData };

    const data = this.transform(bridgeProviderData, payload);

    try {
      const response = await this.axiosInstance.post('sms', data.body);

      if (response.data.Result === 'Success' || response.data.MessageID) {
        return {
          id: response.data.MessageID,
          date: new Date().toISOString(),
        };
      } else {
        throw new Error('Unexpected response format from TNZ API');
      }
    } catch (error) {
      if (error.response?.data?.ErrorMessage) {
        throw new Error(`TNZ API Error: ${error.response.data.ErrorMessage}`);
      }
      throw error;
    }
  }
}
