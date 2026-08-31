import { isOutboundSsrfProtectionEnabled, SmsProviderIdEnum } from '@novu/shared';
import { safeOutboundRequest } from '@novu/shared/utils/safe-outbound-http';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import axios, { AxiosInstance } from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { resolveSafeProviderUrl } from '../../../utils/safe-provider-url';
import { WithPassthrough } from '../../../utils/types';

export class KannelSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.Kannel;
  apiBaseUrl: string;
  private axiosInstance: AxiosInstance;
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.SNAKE_CASE;

  constructor(
    private config: {
      host: string;
      port: string;
      from: string;
      username?: string;
      password?: string;
    }
  ) {
    super();
    this.apiBaseUrl = `http://${config.host}:${config.port}/cgi-bin`;
    this.axiosInstance = axios.create();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const url = `${this.apiBaseUrl}/sendsms`;
    const queryParameters = this.transform(bridgeProviderData, {
      username: this.config.username,
      password: this.config.password,
      from: options.from || this.config.from,
      to: options.to,
      text: options.content,
    }).body;

    if (isOutboundSsrfProtectionEnabled()) {
      const safeUrl = new URL(
        resolveSafeProviderUrl(url, {
          blockedPrefix: 'Kannel host blocked',
        })
      );

      for (const [key, value] of Object.entries(queryParameters)) {
        if (value !== undefined && value !== null) {
          safeUrl.searchParams.set(key, String(value));
        }
      }

      const response = await safeOutboundRequest({ url: safeUrl, method: 'GET' });

      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Kannel request failed with status ${response.statusCode}`);
      }
    } else {
      await this.axiosInstance.get(url, {
        params: queryParameters,
      });
    }

    return {
      id: options.id,
      date: new Date().toDateString(),
    };
  }
}
