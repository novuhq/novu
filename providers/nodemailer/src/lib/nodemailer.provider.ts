import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import nodemailer, { Transporter } from 'nodemailer';
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
      dkim?: DKIM.Options | undefined;
    }
  ) {
    this.transports = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
      dkim: this.config.dkim,
    });
  }

  async sendMessage(
    options: IEmailOptions
  ): Promise<ISendMessageSuccessResponse> {
    const info = await this.transports.sendMail({
      from: options.from || this.config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map((attachment) => ({
        filename: attachment?.name,
        content: attachment.file.toString(),
        contentType: attachment.mime,
      })),
    });

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }
}
