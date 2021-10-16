import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';
import nodemailer, { Transporter } from 'nodemailer';

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
    });

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }
}
