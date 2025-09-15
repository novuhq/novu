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
import axios from 'axios';
import { createHmac } from 'crypto';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { IMailgunClient } from 'mailgun.js/interfaces/IMailgunClient';
import { MailgunMessageData } from 'mailgun.js/interfaces/Messages';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

enum WebhooksIds {
  DELIVERED = 'delivered',
  OPENED = 'opened',
  CLICKED = 'clicked',
  UNSUBSCRIBED = 'unsubscribed',
  COMPLAINED = 'complained',
  PERMANENT_FAIL = 'permanent_fail',
  TEMPORARY_FAIL = 'temporary_fail',
}

export class MailgunEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Mailgun;

  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;

  protected casing = CasingEnum.CAMEL_CASE;
  protected override keyCaseObject: Record<string, string> = {
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
      webhookSigningKey?: string;
    }
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
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
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
      attachment: emailOptions.attachments
        ?.filter((attachment) => !attachment.cid)
        ?.map((attachment) => {
          return {
            data: attachment.file,
            filename: attachment.name,
          };
        }),
      inline: emailOptions.attachments
        ?.filter((attachment) => Boolean(attachment.cid))
        ?.map((attachment) => {
          return {
            data: attachment.file,
            filename: attachment.name,
          };
        }),
    };

    if (emailOptions.replyTo) {
      data['h:Reply-To'] = emailOptions.replyTo;
    }

    const mailgunMessageData: Partial<MailgunMessageData> = this.transform(bridgeProviderData, data).body;

    const response = await this.mailgunClient.messages.create(
      this.config.domain,
      mailgunMessageData as MailgunMessageData
    );

    return {
      id: response.id,
      date: new Date().toISOString(),
    };
  }
  async checkIntegration(_options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    return {
      success: true,
      message: 'Integrated successfully!',
      code: CheckIntegrationResponseEnum.SUCCESS,
    };
  }

  async autoConfigureInboundWebhook(configurations: { webhookUrl: string }): Promise<{
    success: boolean;
    message?: string;
    configurations?: {
      inboundWebhookEnabled: boolean;
      inboundWebhookSigningKey: string;
    };
  }> {
    try {
      // Mailgun webhook events to configure
      const events: WebhooksIds[] = [
        WebhooksIds.DELIVERED,
        WebhooksIds.OPENED,
        WebhooksIds.CLICKED,
        WebhooksIds.PERMANENT_FAIL,
      ];
      const webhookUrl = configurations.webhookUrl;

      // Configure webhooks for each event type
      for (const event of events) {
        try {
          const response = await this.mailgunClient.webhooks.create(this.config.domain, event, webhookUrl);

          if (!response) {
            return {
              success: false,
              message: `Failed to configure webhook for event: ${event}`,
            };
          }
        } catch (error) {
          throw new Error(`Failed to configure webhook for event ${event}, ${error.details}`);
        }
      }

      // Step 2: Retrieve HTTP Webhook Signing Key from Mailgun API
      let webhookSigningKey = null;
      try {
        // Use axios to make HTTP request since mailgun client doesn't have a generic request method
        const baseUrl = this.config.baseUrl || 'https://api.mailgun.net';
        const authHeader = `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`;

        const response = await axios.get(`${baseUrl}/v5/accounts/http_signing_key`, {
          headers: {
            Authorization: authHeader,
          },
        });

        if (response.status === 200 && response.data?.http_signing_key) {
          webhookSigningKey = response.data.http_signing_key;
        }
      } catch (_signingKeyError) {
        // If API call fails, continue without signing key but notify user
      }

      if (!webhookSigningKey) {
        return {
          success: true,
          message:
            'Mailgun webhooks configured successfully. Please add your HTTP Webhook Signing Key from Mailgun Control Panel (API Security → HTTP webhook signing key) to enable signature verification.',
          configurations: {
            inboundWebhookEnabled: true,
            inboundWebhookSigningKey: '',
          },
        };
      }

      return {
        success: true,
        message: 'Mailgun webhooks configured successfully for email events with signature verification enabled',
        configurations: {
          inboundWebhookEnabled: true,
          inboundWebhookSigningKey: webhookSigningKey,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      return {
        success: false,
        message: `Error configuring Mailgun webhooks: ${errorMessage}`,
      };
    }
  }

  async verifySignature({
    rawBody: _rawBody,
    headers: _headers,
    body,
  }: {
    rawBody: unknown;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const bodySignature = body.signature as { timestamp: string; token: string; signature: string };
      const timestamp = bodySignature.timestamp;
      const token = bodySignature.token;
      const signature = bodySignature.signature;

      const webhookSigningKey = this.config.webhookSigningKey;

      if (!webhookSigningKey) {
        return {
          success: true,
          message: 'Mailgun signature verification is not configured',
        };
      }

      if (!timestamp || !token || !signature) {
        const missingFields = [!timestamp ? 'timestamp' : '', !token ? 'token' : '', !signature ? 'signature' : '']
          .filter(Boolean)
          .join(', ');

        return { success: false, message: `Missing required fields: ${missingFields}` };
      }

      const data = timestamp + token;
      const computedSignature = createHmac('sha256', webhookSigningKey).update(data).digest('hex');

      const isValid = computedSignature === signature;

      return {
        success: isValid,
        message: isValid ? 'Mailgun signature verification successful' : 'Mailgun signature verification failed',
      };
    } catch (error) {
      return { success: false, message: `Error verifying signature: ${error.message}` };
    }
  }

  getMessageId(body: any): string[] {
    try {
      const messageId = body['event-data']?.message?.headers?.['message-id'] || body['event-data']?.id;

      if (!messageId) {
        return [];
      }

      // Mailgun send requests return message IDs wrapped in < >
      return [`<${messageId}>`];
    } catch {
      return [];
    }
  }

  parseEventBody(body: any): IEmailEventBody | undefined {
    try {
      const eventData = body['event-data'];

      if (!eventData) {
        return undefined;
      }

      const status = this.getStatus(eventData.event);

      if (status === undefined) {
        return undefined;
      }

      const messageId = eventData.message?.headers?.['message-id'] || eventData.id;

      return {
        status,
        date: new Date(eventData.timestamp * 1000).toISOString(),
        externalId: messageId,
        attempts: eventData['delivery-status']?.['attempt-no'] || 1,
        response: eventData['delivery-status']?.description || eventData.reason || '',
        row: JSON.stringify(eventData),
      };
    } catch {
      return undefined;
    }
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'delivered':
        return EmailEventStatusEnum.DELIVERED;
      case 'opened':
        return EmailEventStatusEnum.OPENED;
      case 'clicked':
        return EmailEventStatusEnum.CLICKED;
      case 'unsubscribed':
        return EmailEventStatusEnum.UNSUBSCRIBED;
      case 'complained':
        return EmailEventStatusEnum.COMPLAINT;
      case 'permanent_fail':
      case 'failed':
        return EmailEventStatusEnum.REJECTED;
      default:
        return undefined;
    }
  }
}
