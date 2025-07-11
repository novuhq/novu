import { PushProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, IPushOptions, IPushProvider } from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

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
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform(bridgeProviderData, options);

    const {
      fiscalCode,
      content, // markdown
      title, // subject
    } = data as unknown as {
      fiscalCode: string;
      content: string;
      title: string;
    };

    const apiKey = (bridgeProviderData as any)?.apiKey;
    const baseUrl = this.config?.AppIOBaseUrl || 'https://api.io.italia.it/api/v1';

    if (!apiKey) {
      throw new Error('Missing App IO API key (must be passed via overrides.apiKey)');
    }

    const profileRes = await this.axiosInstance.post(
      `${baseUrl}/profiles`,
      { fiscal_code: fiscalCode },
      {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    if (profileRes.status !== 200 || profileRes.data?.sender_allowed !== true) {
      throw new Error('Recipient is not allowed or not found in App IO');
    }

    const messageRes = await this.axiosInstance.post(
      `${baseUrl}/messages`,
      {
        fiscal_code: fiscalCode,
        content: {
          subject: title,
          markdown: content,
        },
      },
      {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      id: messageRes.data?.id || '',
      date: new Date().toISOString(),
    };
  }
}
