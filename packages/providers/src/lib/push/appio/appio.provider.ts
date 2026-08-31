import { isOutboundSsrfProtectionEnabled, PushProviderIdEnum } from '@novu/shared';
import { safeOutboundJsonRequest } from '@novu/shared/utils/safe-outbound-http';
import { ChannelTypeEnum, IPushOptions, IPushProvider, ISendMessageSuccessResponse } from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { resolveSafeProviderUrl } from '../../../utils/safe-provider-url';

export class AppioPushProvider extends BaseProvider implements IPushProvider {
  id = PushProviderIdEnum.AppIO;
  channelType = ChannelTypeEnum.PUSH as const;
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  private axiosInstance = axios.create();

  constructor(private config: { AppIOBaseUrl?: string }) {
    super();
  }

  async sendMessage(
    options: IPushOptions,
    bridgeProviderData: Record<string, unknown> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const fiscalCode = options.target?.[0];
    if (!fiscalCode) {
      throw new Error('Missing target (fiscal_code) in push options');
    }

    const { title, content } = options;
    if (!title || !content) {
      throw new Error('Missing title or content in push options');
    }

    const apiKey = bridgeProviderData?.apiKey as string;
    const baseUrl = resolveSafeProviderUrl(this.config?.AppIOBaseUrl || 'https://api.io.italia.it/api/v1', {
      allowedHostnames: ['api.io.italia.it'],
      blockedPrefix: 'AppIO base URL blocked',
      requireHttps: true,
    });

    if (!apiKey) {
      throw new Error('Missing App IO API key (must be passed via bridgeProviderData.apiKey)');
    }

    const headers = {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json',
    };
    const profileRes = isOutboundSsrfProtectionEnabled()
      ? await safeOutboundJsonRequest<{ sender_allowed?: boolean }>({
          url: `${baseUrl}/profiles`,
          method: 'POST',
          body: { fiscal_code: fiscalCode },
          headers,
        })
      : await this.axiosInstance.post(`${baseUrl}/profiles`, { fiscal_code: fiscalCode }, { headers });

    if (!profileRes) {
      throw new Error('Invalid response from App IO profile API');
    }

    const profileStatus = 'statusCode' in profileRes ? profileRes.statusCode : profileRes.status;
    const profileData = 'body' in profileRes ? profileRes.body : profileRes.data;

    if (profileStatus !== 200 || profileData?.sender_allowed !== true) {
      throw new Error('Recipient is not allowed or not found in App IO');
    }

    const messageBody = {
      fiscal_code: fiscalCode,
      content: {
        subject: title,
        markdown: content,
      },
    };
    const messageRes = isOutboundSsrfProtectionEnabled()
      ? await safeOutboundJsonRequest<{ id?: string }>({
          url: `${baseUrl}/messages`,
          method: 'POST',
          body: messageBody,
          headers,
        })
      : await this.axiosInstance.post(`${baseUrl}/messages`, messageBody, { headers });
    const messageData = 'body' in messageRes ? messageRes.body : messageRes.data;

    if (!messageRes || !messageData) {
      throw new Error('Invalid response from App IO message API');
    }

    return {
      id: messageData.id || '',
      date: new Date().toISOString(),
    };
  }
}
