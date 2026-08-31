import { isOutboundSsrfProtectionEnabled, SmsProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { resolveSafeProviderUrl } from '../../../utils/safe-provider-url';
import { WithPassthrough } from '../../../utils/types';

export class MobishastraProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Mobishastra;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.CAMEL_CASE;
  axiosInstance: AxiosInstance;
  headers: Record<string, string>;

  constructor(
    private config: {
      baseUrl: string;
      username: string;
      password: string;
      language?: string;
      from: string;
    }
  ) {
    super();
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const transformedData = this.transform(bridgeProviderData, {
      Sender: options.from || this.config.from,
      number: options.to,
      msg: options.content,
      user: this.config.username,
      pwd: this.config.password,
    });
    const requestBody = JSON.stringify([transformedData.body]);
    let responseData: Record<string, string> | undefined;

    if (isOutboundSsrfProtectionEnabled()) {
      const url = resolveSafeProviderUrl(this.config.baseUrl, {
        blockedPrefix: 'Mobishastra base URL blocked',
      });
      const response = await safeOutboundJsonRequest<Record<string, string>[]>({
        url,
        method: 'POST',
        body: requestBody,
        headers: transformedData.headers,
      });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Mobishastra request failed with status ${response.statusCode}`);
      }

      responseData = response.body?.[0];
    } else {
      const response = await this.axiosInstance.request({
        method: 'POST',
        data: requestBody,
        headers: transformedData.headers,
      });
      responseData = response.data?.[0];
    }

    const messageId = responseData?.msg_id?.trim();

    if (!messageId) {
      const errorMessage = responseData?.str_response || 'Failed to send message';
      throw new Error(errorMessage);
    }

    return {
      id: messageId,
      date: new Date().toISOString(),
    };
  }
}
