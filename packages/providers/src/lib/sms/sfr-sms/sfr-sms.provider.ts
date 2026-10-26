import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';

export interface ISfrAddSingleCallResponse {
  success: boolean;
  response?: number | string;
  errorCode?: string;
  errorDetail?: string;
}

type SfrSmsMedia = 'SMS' | 'SMSLong' | 'SMSUnicode' | 'SMSUnicodeLong';

const GSM_7BIT_CHARSET =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà' +
  '^{}\\[~]|€\f';

const SINGLE_SMS_MAX_LENGTH = 160;
const SINGLE_UNICODE_SMS_MAX_LENGTH = 70;

export class SfrSmsProvider extends BaseProvider implements ISmsProvider {
  id = SmsProviderIdEnum.SfrSms;
  channelType: ChannelTypeEnum.SMS = ChannelTypeEnum.SMS;
  public readonly BASE_URL = 'https://www.dmc.sfr-sh.fr/DmcWS/1.6.0/JsonService/MessagesUnitairesWS';
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  private readonly httpClient = createProviderHttpClient();

  constructor(
    private config: {
      serviceId: string;
      servicePassword: string;
      spaceId: string;
      from: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const payload = this.transform(bridgeProviderData, {
      media: this.getMedia(options.content),
      textMsg: options.content,
      from: options.from || this.config.from,
      to: options.to,
    });

    const { data } = await this.httpClient.get<ISfrAddSingleCallResponse>(`${this.BASE_URL}/addSingleCall`, {
      params: {
        authenticate: JSON.stringify({
          serviceId: this.config.serviceId,
          servicePassword: this.config.servicePassword,
          spaceId: this.config.spaceId,
        }),
        messageUnitaire: JSON.stringify(payload.body),
      },
      headers: {
        ...payload.headers,
      },
      responseType: 'json',
    });

    if (!data?.success) {
      const reason = data?.errorDetail || data?.errorCode || data?.response || 'unknown error';
      throw new Error(`SFR SMS: ${reason}`);
    }

    return {
      id: String(data.response),
      date: new Date().toISOString(),
    };
  }

  private getMedia(content: string): SfrSmsMedia {
    const isUnicode = [...content].some((char) => !GSM_7BIT_CHARSET.includes(char));
    const maxLength = isUnicode ? SINGLE_UNICODE_SMS_MAX_LENGTH : SINGLE_SMS_MAX_LENGTH;
    const isLong = content.length > maxLength;

    if (isUnicode) {
      return isLong ? 'SMSUnicodeLong' : 'SMSUnicode';
    }

    return isLong ? 'SMSLong' : 'SMS';
  }
}
