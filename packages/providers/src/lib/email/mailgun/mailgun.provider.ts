import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
  ICheckIntegrationResponse,
  CheckIntegrationResponseEnum,
} from '@novu/stateless';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/interfaces/IMailgunClient';
import { MailgunMessageData } from 'mailgun.js/interfaces/Messages';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

export class MailgunEmailProvider
  extends BaseProvider
  implements IEmailProvider
{
  id = EmailProviderIdEnum.Mailgun;

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  protected casing = CasingEnum.CAMEL_CASE;
  protected keyCaseObject: Record<string, string> = {
    ampHtml: 'amp-html',
    tVersion: 't:version',
    tText: 't:text',
    oTag: 'o:tag',
    oDkim: 'o:dkim',
    oDeliverytime: 'o:deliverytime',
    oDeliverytimeOptimizePeriod: 'o:deliverytime-optimize-period',
    oTimeZoneLocalize: 'o:time-zone-localize',
    oTestmode: 'o:testmode',
    oTracking: 'o:tracking',
    oTrackingClicks: 'o:tracking-clicks',
    oTrackingOpens: 'o:tracking-opens',
    oRequireTls: 'o:require-tls',
    oSkipVerification: 'o:skip-verification',
    recipientVariables: 'recipient-variables',
  };

  private mailgunClient: IMailgunClient;

  constructor(
    private config: {
      apiKey: string;
      baseUrl?: string;
      username: string;
      domain: string;
      from: string;
      senderName: string;
    },
  ) {
    super();
    const mailgun = new Mailgun(formData);

    this.mailgunClient = mailgun.client({
      username: config.username,
      key: config.apiKey,
      url: config.baseUrl || 'https://api.mailgun.net',
    });
  }

  async sendMessage(
    emailOptions: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {},
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = emailOptions.senderName || this.config.senderName;
    const fromAddress = emailOptions.from || this.config.from;
    const data = {
      from: senderName ? `${senderName} <${fromAddress}>` : fromAddress,
      to: emailOptions.to,
      subject: emailOptions.subject,
      html: emailOptions.html,
      cc: emailOptions.cc?.join(','),
      bcc: emailOptions.bcc?.join(','),
      attachment: emailOptions.attachments?.map((attachment) => {
        return {
          data: attachment.file,
          filename: attachment.name,
        };
      }),
    };

    if (emailOptions.replyTo) {
      data['h:Reply-To'] = emailOptions.replyTo;
    }

    const mailgunMessageData: Partial<MailgunMessageData> = this.transform(
      bridgeProviderData,
      data,
    ).body;

    const response = await this.mailgunClient.messages.create(
      this.config.domain,
      mailgunMessageData as MailgunMessageData,
    );

    return {
      id: response.id,
      date: new Date().toISOString(),
    };
  }
  async checkIntegration(
    options: IEmailOptions,
  ): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }
}
