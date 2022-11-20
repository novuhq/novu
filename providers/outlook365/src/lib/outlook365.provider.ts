import {
  ChannelTypeEnum,
<<<<<<< HEAD
<<<<<<< HEAD
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
=======
  ISendMessageSuccessResponse,
  IEmailOptions,
  IEmailProvider,
>>>>>>> df77c37be (feat: New Office365 provider)
=======
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
<<<<<<< HEAD
<<<<<<< HEAD

export class Outlook365Provider implements IEmailProvider {
  id = 'outlook365';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

=======
import DKIM from 'nodemailer/lib/dkim';
=======
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)

export class Outlook365Provider implements IEmailProvider {
  id = 'outlook365';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

>>>>>>> df77c37be (feat: New Office365 provider)
  private transports: Transporter;

  constructor(
    private config: {
<<<<<<< HEAD
      from: string;
<<<<<<< HEAD
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
=======
=======
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)
      user: string;
      password: string;
    }
  ) {
    this.transports = nodemailer.createTransport({
      host: 'smtp.office365.com',
      port: 587,
      requireTLS: true,
      connectionTImeout: 30000,
      auth: {
        user: this.config.user,
>>>>>>> df77c37be (feat: New Office365 provider)
        pass: this.config.password,
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
<<<<<<< HEAD
<<<<<<< HEAD
      date: new Date().toISOString(),
=======
      data: new Date().toISOString(),
>>>>>>> df77c37be (feat: New Office365 provider)
=======
      date: new Date().toISOString(),
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)
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
<<<<<<< HEAD
<<<<<<< HEAD
      from: this.config.from,
=======
      from: options.from || this.config.from,
>>>>>>> df77c37be (feat: New Office365 provider)
=======
      from: this.config.user,
>>>>>>> 623a888d8 (feat: Updated docs, updated logo, updated config)
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
