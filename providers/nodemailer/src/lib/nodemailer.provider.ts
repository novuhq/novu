import { ChannelTypeEnum, IEmailOptions, IEmailProvider } from '@notifire/core';
import nodemailer from 'nodemailer';

export class NodemailerProvider implements IEmailProvider {
  id = 'nodemailer';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  transporter;

  constructor(
    private config: {
      from: string;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
    }
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.password,
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async sendMessage(options: IEmailOptions): Promise<any> {
    return await this.transporter.sendMail({
      from: options.from || this.config.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  }
}
