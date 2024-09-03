import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class Outlook365Provider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Outlook365;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private transports: Transporter;

  constructor(
    private config: {
      from: string;
      senderName: string;
      password: string;
    },
  ) {
    super();
    this.transports = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      requireTLS: true,
      connectionTimeout: 30000,
      auth: {
        user: this.config.from,
        pass: this.config.password,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const mailData = this.createMailData(options);
    const info = await this.transports.sendMail(
      this.transform(bridgeProviderData, mailData).body,
    );

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions,
  ): Promise<ICheckIntegrationResponse> {
    try {
      const mailData = this.createMailData(options);
      await this.transports.sendMail(mailData);

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

  private createMailData(options: IEmailOptions): SendMailOptions {
    const sendMailOptions: SendMailOptions = {
      from: {
        address: options.from || this.config.from,
        name: options.senderName || this.config.senderName,
      },
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map((attachment) => ({
        filename: attachment?.name,
        content: attachment.file,
        contentType: attachment.mime,
      })),
    };

    if (options.replyTo) {
      sendMailOptions.replyTo = options.replyTo;
    }

    return sendMailOptions;
  }
}
