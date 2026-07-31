import { createHmac, randomUUID } from 'crypto';
import { SmsProviderIdEnum } from '@novu/shared';
import { ChannelTypeEnum, ISendMessageSuccessResponse, ISmsOptions, ISmsProvider } from '@novu/stateless';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

interface IAliyunResponse {
  Code?: string;
  Message?: string;
  RequestId?: string;
  BizId?: string;
}

/**
 * Aliyun (Alibaba Cloud) SMS provider.
 *
 * Uses the Dysmsapi `SendSms` RPC action (API version 2017-05-25). Requests are
 * authenticated with the standard Aliyun RPC signature (HMAC-SHA1 over the sorted,
 * percent-encoded query string), so no external SDK dependency is required.
 *
 * Aliyun SMS is strictly template-based: a registered `TemplateCode` and a JSON
 * `TemplateParam` are required. `TemplateCode` (and any `TemplateParam` override)
 * can be supplied per-message through the bridge `_passthrough.body`, while the
 * message `content` is used as the default `TemplateParam`.
 */
export class AliyunSmsProvider extends BaseProvider implements ISmsProvider {
  public static readonly BASE_URL = 'https://dysmsapi.aliyuncs.com/';
  channelType = ChannelTypeEnum.SMS as ChannelTypeEnum.SMS;
  protected casing = CasingEnum.PASCAL_CASE;
  id = SmsProviderIdEnum.Aliyun;

  constructor(
    private config: {
      accessKeyId?: string;
      accessKeySecret?: string;
      from?: string;
      regionId?: string;
    }
  ) {
    super();
  }

  async sendMessage(
    options: ISmsOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const data = this.transform<Record<string, string>>(bridgeProviderData, {
      phoneNumbers: options.to,
      signName: options.from || this.config.from,
      templateParam: options.content,
    });

    const params: Record<string, string> = {
      AccessKeyId: this.config.accessKeyId || '',
      Action: 'SendSms',
      Format: 'JSON',
      RegionId: this.config.regionId || 'cn-hangzhou',
      SignatureMethod: 'HMAC-SHA1',
      SignatureNonce: randomUUID(),
      SignatureVersion: '1.0',
      Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
      Version: '2017-05-25',
      ...data.body,
    };

    const canonicalizedQuery = Object.keys(params)
      .sort()
      .map((key) => `${this.percentEncode(key)}=${this.percentEncode(params[key])}`)
      .join('&');

    const stringToSign = `GET&${this.percentEncode('/')}&${this.percentEncode(canonicalizedQuery)}`;
    const signature = createHmac('sha1', `${this.config.accessKeySecret ?? ''}&`)
      .update(stringToSign)
      .digest('base64');

    const url = `${AliyunSmsProvider.BASE_URL}?Signature=${this.percentEncode(signature)}&${canonicalizedQuery}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...data.headers,
      },
    });

    const body = (await response.json()) as IAliyunResponse;

    if (body.Code && body.Code !== 'OK') {
      throw new Error(`Aliyun SMS request failed (${body.Code}): ${body.Message}`);
    }

    return {
      id: body.BizId,
      date: new Date().toISOString(),
    };
  }

  /**
   * Percent-encode a value per Aliyun's RPC signing rules (RFC 3986 with the
   * `+`, `*` and `~` adjustments), matching how the canonical query string is signed.
   */
  private percentEncode(value: string): string {
    return encodeURIComponent(value)
      .replace(/\+/g, '%20')
      .replace(/\*/g, '%2A')
      .replace(/%7E/g, '~');
  }
}
