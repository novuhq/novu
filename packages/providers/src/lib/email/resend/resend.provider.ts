import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
  IEmailOptions,
  IEmailProvider,
} from '@novu/stateless';
import { Resend } from 'resend';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class ResendEmailProvider
  extends BaseProvider
  implements IEmailProvider
{
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  id = EmailProviderIdEnum.Resend;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private resendClient: Resend;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName?: string;
    },
  ) {
    super();
    this.resendClient = new Resend(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config?.senderName;
    const fromAddress = options.from || this.config.from;

    const response = await this.resendClient.emails.send(
      this.transform<any>(bridgeProviderData, {
        from: senderName ? `${senderName} <${fromAddress}>` : fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        reply_to: options.replyTo || null,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment?.name,
          content: attachment.file,
        })),
        bcc: options.bcc,
        headers: options.headers,
      }).body,
    );

    if (response.error) {
      throw new Error(response.error.message);
    }

    return {
      id: response.data?.id,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions,
  ): Promise<ICheckIntegrationResponse> {
    try {
      await this.resendClient.emails.send({
        from: options.from || this.config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        attachments: options.attachments?.map((attachment) => ({
          filename: attachment?.name,
          content: attachment.file,
        })),
        bcc: options.bcc,
      });

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }
}
