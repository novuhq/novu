import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import nodemailer, { SendMailOptions, Transporter } from 'nodemailer';
import DKIM from 'nodemailer/lib/dkim';

export class NodemailerProvider implements IEmailProvider {
  id = 'nodemailer';

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  private transports: Transporter;

  constructor(
    private config: {
      from: string;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      dkim?: DKIM.SingleKeyOptions | undefined;
    }
  ) {
    let dkim = this.config.dkim;

    if (!dkim?.domainName || !dkim?.privateKey || !dkim?.keySelector) {
      dkim = undefined;
    }

    this.transports = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      dkim,
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
        // nodemailer does not provide a way to distinguish errors
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  private createMailData(options: IEmailOptions): SendMailOptions {
    return {
      from: options.from || this.config.from,
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
