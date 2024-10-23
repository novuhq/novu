import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  EmailEventStatusEnum,
  ICheckIntegrationResponse,
  IEmailEventBody,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';
import { EmailProviderIdEnum } from '@novu/shared';
import { SESConfig } from './ses.config';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class SESEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.SES;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private readonly ses: SESClient;

  constructor(private readonly config: SESConfig) {
    super();
    this.ses = new SESClient({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  private async sendMail(
    {
      html,
      text,
      to,
      from,
      senderName,
      subject,
      attachments,
      cc,
      bcc,
      replyTo,
    },
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ) {
    const transporter = nodemailer.createTransport({
      SES: { ses: this.ses, aws: { SendRawEmailCommand } },
    });

    return await transporter.sendMail(
      this.transform(bridgeProviderData, {
        to,
        html,
        text,
        subject,
        attachments,
        from: {
          address: from,
          name: senderName,
        },
        cc,
        bcc,
        replyTo,
      }).body,
    );
  }

  async sendMessage(
    {
      html,
      text,
      to,
      from,
      subject,
      attachments,
      cc,
      bcc,
      replyTo,
      senderName,
    }: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const info = await this.sendMail(
      {
        from: from || this.config.from,
        senderName: senderName || this.config.senderName,
        to,
        subject,
        html,
        text,
        attachments: attachments?.map((attachment) => ({
          filename: attachment?.name,
          content: attachment.file,
          contentType: attachment.mime,
          cid: attachment.cid,
          contentDisposition: attachment.disposition ?? (Boolean(attachment.cid) ? 'inline' : undefined),
        })),
        cc,
        bcc,
        replyTo,
      },
      bridgeProviderData,
    );

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  getMessageId(body: any | any[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item) => item.mail.messageId);
    }

    return [body.mail.messageId];
  }

  parseEventBody(
    body: any | any[],
    identifier: string,
  ): IEmailEventBody | undefined {
    if (Array.isArray(body)) {
      // eslint-disable-next-line no-param-reassign
      body = body.find((item) => item.mail.messageId === identifier);
    }

    if (!body) {
      return undefined;
    }

    const status = this.getStatus(body.eventType);

    if (status === undefined) {
      return undefined;
    }

    return {
      status,
      date: new Date(body.mail.timestamp).toISOString(),
      externalId: body.mail.messageId,
      row: body,
    };
  }

  /**
   * The `Subscription` event status is not considered since it is not an action
   * or outcome of the event but the state of the subscriber preferences.
   */
  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'Bounce':
        return EmailEventStatusEnum.BOUNCED;
      case 'Complaint':
        return EmailEventStatusEnum.COMPLAINT;
      case 'Delivery':
        return EmailEventStatusEnum.DELIVERED;
      case 'Send':
        return EmailEventStatusEnum.SENT;
      case 'Reject':
        return EmailEventStatusEnum.REJECTED;
      case 'Open':
        return EmailEventStatusEnum.OPENED;
      case 'Click':
        return EmailEventStatusEnum.CLICKED;
      case 'DeliveryDelay':
        return EmailEventStatusEnum.DELAYED;
      default:
        return undefined;
    }
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
        bcc: [],
        cc: [],
        replyTo: 'support@novu.co',
        senderName: 'Novu Support',
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
