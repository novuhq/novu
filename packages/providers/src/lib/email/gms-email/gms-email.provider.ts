import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  ICheckIntegrationResponse,
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
} from '@novu/stateless';
import axios from 'axios';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class GmsEmailEmailProvider
  extends BaseProvider
  implements IEmailProvider
{
  id = EmailProviderIdEnum.GmsEmail;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;

  private axiosInstance = axios.create();

  constructor(
    private config: {
      baseUrl: string;
      from: string;
      senderName: string;
    }
  ) {
    super();
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config.senderName;
    const fromAddress = options.from || this.config.from;
    const from = senderName ? `${senderName} <${fromAddress}>` : fromAddress;

    const toList = Array.isArray(options.to) ? options.to : [options.to];
    const ccList = options.cc || [];
    const bccList = options.bcc || [];

    const recipients = [
      ...toList.filter(Boolean).map((email) => ({ email })),
      ...ccList.filter(Boolean).map((email) => ({ email, type: 'cc' as const })),
      ...bccList.filter(Boolean).map((email) => ({ email, type: 'bcc' as const })),
    ];

    if (!recipients.length) {
      throw new Error('GMS Email provider requires at least one recipient');
    }

    const allAttachments = options.attachments || [];

    const attachments = allAttachments.map((attachment) => ({
      name: attachment.name,
      type: attachment.mime,
      content: attachment.file.toString('base64'),
      disposition: attachment.disposition,
      contentId: attachment.cid,
    }));

    const inlineAttachments = allAttachments
      .filter((attachment) => Boolean(attachment.cid))
      .map((attachment) => ({
        contentId: attachment.cid as string,
      }));

    const payload = {
      request: {
        recipients,
        body: {
          html: options.html,
          plaintext: options.text,
        },
        subject: options.subject,
        sender_email: fromAddress,
        sender_name: senderName,
        reply_to: options.replyTo,
        attachments,
        inline_attachments: inlineAttachments.length ? inlineAttachments : undefined,
      },
    };

    const transformed = this.transform(bridgeProviderData, payload);

    let url = this.config.baseUrl.replace(/\/+$/, '');
    if (!/\/email\/send$/i.test(url)) {
      url = `${url}/email/send`;
    }

    const queryParams = new URLSearchParams(transformed.query).toString();
    if (queryParams) {
      url = `${url}?${queryParams}`;
    }

    const response = await this.axiosInstance.post(url, transformed.body, {
      headers: {
        'content-type': 'application/json',
        ...transformed.headers,
      },
    });

    const jobId = (response.data && (response.data.job_id || response.data.jobId)) || undefined;

    return {
      id: jobId || options.id,
      date: new Date().toISOString(),
    };
  }
}
