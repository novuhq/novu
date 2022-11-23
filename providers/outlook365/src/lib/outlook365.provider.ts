import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
  IEmailEventBody,
} from '@novu/stateless';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';

export class Outlook365Provider implements IEmailProvider {
  id = 'outlook365';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private transports: Transporter;

  constructor(
    private config: {
      from: string;
      senderName: string;
      password: string;
    }
  ) {
    this.transports = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      requireTLS: true,
      connectionTImeout: 30000,
      auth: {
        user: this.config.from,
        password: this.config.password,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const mailData = this.createMailData(options);
    const info = await this.transports.sendMail(mailData);

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(
    options: IEmailOptions
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
    return {
      from: this.config.from,
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
  }
}
