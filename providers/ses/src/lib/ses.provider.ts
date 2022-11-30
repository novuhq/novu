import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { SESConfig } from './ses.config';
import nodemailer from 'nodemailer';

export class SESEmailProvider implements IEmailProvider {
  id = 'ses';
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly ses: SESClient;

  constructor(private readonly config: SESConfig) {
    this.ses = new SESClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  private async sendMail({ html, text, to, from, subject, attachments }) {
    const transporter = nodemailer.createTransport({
      SES: { ses: this.ses, aws: { SendRawEmailCommand } },
    });

    return await transporter.sendMail({
      html,
      text,
      to,
      from,
      subject,
      attachments,
    });
  }

  async sendMessage({
    html,
    text,
    to,
    from,
    subject,
    attachments,
  }: IEmailOptions): Promise<ISendMessageSuccessResponse> {
    const info = await this.sendMail({
      from: from || this.config.from,
      to: to,
      subject: subject,
      html: html,
      text: text,
      attachments: attachments?.map((attachment) => ({
        filename: attachment?.name,
        content: attachment.file,
        contentType: attachment.mime,
      })),
    });

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  async checkIntegration(): Promise<ICheckIntegrationResponse> {
    try {
      await this.sendMail({
        html: '',
        text: 'This is a Test mail to test your Amazon SES integration',
        to: 'no-reply@novu.co',
        from: this.config.from,
        subject: 'Test SES integration',
        attachments: {},
      });

      return {
        success: true,
        message: 'Integrated Successfully',
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
