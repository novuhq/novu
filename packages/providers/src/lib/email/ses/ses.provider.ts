import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { EmailProviderIdEnum } from '@novu/shared';
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
import nodemailer from 'nodemailer';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';
import { SESConfig } from './ses.config';

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
    { html, text, to, from, senderName, subject, attachments, cc, bcc, replyTo },
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
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
        ...(this.config.configurationSetName && {
          ses: { ConfigurationSetName: this.config.configurationSetName },
        }),
      }).body
    );
  }

  async sendMessage(
    { html, text, to, from, subject, attachments, cc, bcc, replyTo, senderName }: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
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
          contentDisposition: attachment.disposition ?? (attachment.cid ? 'inline' : undefined),
        })),
        cc,
        bcc,
        replyTo,
      },
      bridgeProviderData
    );

    return {
      id: info?.messageId,
      date: new Date().toISOString(),
    };
  }

  getMessageId(body: any | any[]): string[] {
    const parsedBody = this.jsonParseBody(body);

    if (Array.isArray(parsedBody)) {
      return parsedBody.map((item) => buildMessageId(item));
    }

    return [buildMessageId(parsedBody)];
  }

  private jsonParseBody(body: any) {
    // Extract actual webhook data from SNS notification wrapper if present
    let extractedMessage = body;

    // Check if this is an SNS notification containing webhook data
    if (this.isSnsNotificationWithMessage(body)) {
      try {
        // Parse the nested Message field which contains the actual SES webhook data
        extractedMessage = JSON.parse(body.Message);
      } catch (error) {
        throw new Error('Failed to parse SNS Message field');
      }
    }

    return { ...body, Message: extractedMessage };
  }

  parseEventBody(body: any | any[], identifier: string): IEmailEventBody | undefined {
    const parsedBody = this.jsonParseBody(body);

    if (!parsedBody) {
      return undefined;
    }

    const status = this.getStatus(parsedBody.Message.eventType);

    if (status === undefined) {
      return undefined;
    }

    return {
      status,
      date: new Date(parsedBody.Message.mail.timestamp).toISOString(),
      externalId: parsedBody.Message.mail.messageId,
      row: parsedBody,
    };
  }

  /**
   * Checks if this is an SNS notification containing a Message field with webhook data
   */
  private isSnsNotificationWithMessage(body: any): boolean {
    return body?.Type === 'Notification' && typeof body?.Message === 'string' && body.Message.length > 0;
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
        replyTo: this.config.from,
        senderName: this.config.senderName,
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
function buildMessageId(body: any) {
  try {
    if (body.Message.mail.messageId && body.Message.delivery.reportingMTA) {
      const messageId = body.Message.mail.messageId;
      // example arn:aws:ses:us-east-1:123456789012:identity/sender@example.com
      const region = body.Message.mail.sourceArn.split(':')[3];
      // this is the format of the messageId generated by AWS SES SendEmail API
      return `<${messageId}@${region}.amazonses.com>`;
    }

    throw new Error('Unable to extract message ID from webhook body');
  } catch (error) {
    console.error('Failed to build message ID:', error);
    console.error('Body:', JSON.stringify(body, null, 2));
    throw error;
  }
}
