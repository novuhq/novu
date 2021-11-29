import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@notifire/core';
import aws, { SESv2 } from '@aws-sdk/client-sesv2';
import nodemailer, { Transporter } from 'nodemailer';
import sesTransport from 'nodemailer-ses-transport';
import { SESConfig } from './ses.config';

export class SESEmailProvider implements IEmailProvider {
  id = 'ses';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly transporter: Transporter;

  constructor(private readonly config: SESConfig) {
    const ses = new SESv2({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.transporter = nodemailer.createTransport(
      sesTransport({
        SES: { ses, aws },
      })
    );
  }

  async sendMessage({
    html,
    text,
    to,
    from,
    subject,
    attachments,
  }: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const result = await this.transporter.sendMail({
      from: from || this.config.from,
      to,
      subject,
      html,
      attachments: attachments?.map((attachment) => ({
        filename: attachment?.name,
        content: attachment.file.toString(),
        contentType: attachment.mime,
      })),
    });

    return {
      id: result?.messageId,
      date: new Date().toISOString(),
    };
  }
}
