import { EmailProviderIdEnum, IEmailOptions } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  EmailEventStatusEnum,
  IAttachmentOptions,
  ICheckIntegrationResponse,
  IEmailEventBody,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import sgClient from '@sendgrid/client';
// cspell:disable-next-line
import { EventWebhook } from '@sendgrid/eventwebhook';
import { MailDataRequired, MailService } from '@sendgrid/mail';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

type AttachmentJSON = MailDataRequired['attachments'][0];

export class SendgridEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.SendGrid;
  protected casing: CasingEnum = CasingEnum.CAMEL_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private sendgridMail: MailService;
  private sendgridClient: typeof sgClient;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName: string;
      ipPoolName?: string;
      webhookPublicKey?: string;
    }
  ) {
    super();
    this.sendgridMail = new MailService();
    this.sendgridMail.setApiKey(this.config.apiKey);
    this.sendgridClient = sgClient;
    this.sendgridClient.setApiKey(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const mailData = this.createMailData(options);
    const response = await this.sendgridMail.send(
      this.transform<MailDataRequired>(bridgeProviderData, mailData as unknown as Record<string, unknown>).body
    );

    return {
      id: options.id || response[0]?.headers['x-message-id'],
      date: response[0]?.headers?.date,
    };
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      const mailData = this.createMailData(options);

      const response = await this.sendgridMail.send(mailData);

      if (response[0]?.statusCode === 202) {
        return {
          success: true,
          message: 'Integration Successful',
          code: CheckIntegrationResponseEnum.SUCCESS,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error?.response?.body?.errors[0]?.message,
        code: mapResponse(error?.code),
      };
    }
  }

  private createMailData(options: IEmailOptions) {
    const dynamicTemplateData = options.customData?.dynamicTemplateData;
    const templateId = options.customData?.templateId as unknown as string;
    /*
     * deleted below values from customData to avoid passing them
     * in customArgs because customArgs has max limit of 10,000 bytes
     */
    delete options.customData?.dynamicTemplateData;
    delete options.customData?.templateId;

    const attachments = options.attachments?.map((attachment: IAttachmentOptions) => {
      const attachmentJson: AttachmentJSON = {
        content: attachment.file.toString('base64'),
        filename: attachment.name,
        type: attachment.mime,
      };

      if (attachment?.cid) {
        attachmentJson.contentId = attachment?.cid;
      }

      if (attachment?.disposition) {
        attachmentJson.disposition = attachment?.disposition;
      } else if (attachment?.cid) {
        attachmentJson.disposition = 'inline';
      }

      return attachmentJson;
    });

    const mailData: Partial<MailDataRequired> = {
      from: {
        email: options.from || this.config.from,
        name: options.senderName || this.config.senderName,
      },
      ...this.getIpPoolObject(options),
      to: options.to.map((email) => ({ email })),
      cc: options.cc?.map((ccItem) => ({ email: ccItem })),
      bcc: options.bcc?.map((ccItem) => ({ email: ccItem })),
      html: options.html,
      subject: options.subject,
      substitutions: {},
      category: options.notificationDetails?.workflowIdentifier,
      customArgs: {
        id: options.id,
        novuTransactionId: options.notificationDetails?.transactionId,
        novuMessageId: options.id,
        novuWorkflowIdentifier: options.notificationDetails?.workflowIdentifier,
        novuSubscriberId: options.notificationDetails?.subscriberId,
        ...options.customData,
      },
      attachments,
      personalizations: [
        {
          to: options.to.map((email) => ({ email })),
          cc: options.cc?.map((ccItem) => ({ email: ccItem })),
          bcc: options.bcc?.map((bccItem) => ({ email: bccItem })),
          dynamicTemplateData,
        },
      ],
      templateId,
      headers: options.headers,
    };

    if (options.replyTo) {
      mailData.replyTo = options.replyTo;
    }

    return mailData as MailDataRequired;
  }

  private getIpPoolObject(options: IEmailOptions) {
    const ipPoolNameValue = options.ipPoolName || this.config.ipPoolName;

    return ipPoolNameValue ? { ipPoolName: ipPoolNameValue } : {};
  }

  getMessageId(body: unknown | unknown[]): string[] {
    if (Array.isArray(body)) {
      return body.map((item: any) => item.id);
    }

    return [(body as any).id];
  }

  async verifySignature({
    rawBody,
    headers = {},
    body: _body,
  }: {
    rawBody: any;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const signature = this.getHeaderValue(headers, 'x-twilio-email-event-webhook-signature');
      const timestamp = this.getHeaderValue(headers, 'x-twilio-email-event-webhook-timestamp');
      const isSignatureVerificationEnabled = signature && timestamp;

      if (!isSignatureVerificationEnabled) {
        return { success: true, message: 'SendGrid signature verification is disabled for this request' };
      }
      const publicKey = this.config.webhookPublicKey;

      if (!publicKey || rawBody === undefined) {
        const message = [!publicKey ? 'Public key is undefined' : '', !rawBody ? 'Body is undefined' : '']
          .filter(Boolean)
          .join(',');
        return { success: false, message };
      }

      const eventWebhook = new EventWebhook();
      const ecdsaPublicKey = eventWebhook.convertPublicKeyToECDSA(publicKey);

      const result = eventWebhook.verifySignature(ecdsaPublicKey, rawBody, signature, timestamp);

      return { success: result, message: 'Provider signature verification result' };
    } catch (error) {
      return { success: false, message: `Error verifying signature: ${error.message}` };
    }
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
      // Step 1: Create a new Event Webhook
      const [createResponse, createBody] = await this.sendgridClient.request({
        url: '/v3/user/webhooks/event/settings',
        method: 'POST' as const,
        body: {
          url: configurations.webhookUrl,
          enabled: true,
          delivery_logs: true,
          engagement_data: true,
          friendly_name: 'Novu Inbound Webhook',
          open: true,
          click: true,
          bounce: true,
          dropped: true,
          delivered: true,
        },
      });

      if (createResponse.statusCode !== 201) {
        return {
          success: false,
          message: `Failed to create webhook: ${createBody?.errors?.[0]?.message || 'Unknown error'}`,
        };
      }

      const webhookId = createBody.id;

      // Step 2: Enable Signature Verification
      const [enableSignatureResponse, enableSignatureBody] = await this.sendgridClient.request({
        url: `/v3/user/webhooks/event/settings/signed/${webhookId}`,
        method: 'PATCH' as const,
        body: {
          enabled: true,
        },
      });

      if (enableSignatureResponse.statusCode !== 200) {
        return {
          success: false,
          message: `Failed to enable signature verification: ${enableSignatureBody?.errors?.[0]?.message || 'Unknown error'}`,
        };
      }

      const publicKey = enableSignatureBody.public_key;

      if (!publicKey) {
        return {
          success: false,
          message: 'Failed to retrieve signature verification key',
        };
      }

      return {
        success: true,
        message: 'SendGrid webhook configured successfully with signature verification enabled',
        configurations: {
          inboundWebhookEnabled: true,
          inboundWebhookSigningKey: publicKey,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error configuring SendGrid webhook: ${error?.response?.body?.errors?.[0]?.message ? error?.response?.body?.errors?.[0]?.message : 'Unknown error'}`,
      };
    }
  }

  private getHeaderValue(headers: Record<string, string>, headerName: string): string | undefined {
    // Case-insensitive header lookup
    const lowerHeaderName = headerName.toLowerCase();
    const key = Object.keys(headers).find((k) => k.toLowerCase() === lowerHeaderName);

    return key ? headers[key] : undefined;
  }

  parseEventBody(body: unknown | unknown[], identifier: string): IEmailEventBody | undefined {
    let eventBody: any;
    if (Array.isArray(body)) {
      eventBody = body.find((item: any) => item.id === identifier);
    } else {
      eventBody = body;
    }

    if (!eventBody) {
      return undefined;
    }

    const status = this.getStatus(eventBody.event);

    if (status === undefined) {
      return undefined;
    }

    return {
      status,
      date: new Date().toISOString(),
      externalId: eventBody.id,
      attempts: eventBody.attempt ? parseInt(eventBody.attempt, 10) : 1,
      response: eventBody.response ? eventBody.response : '',
      row: eventBody,
    };
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'open':
        return EmailEventStatusEnum.OPENED;
      case 'bounce':
        return EmailEventStatusEnum.BOUNCED;
      case 'click':
        return EmailEventStatusEnum.CLICKED;
      case 'dropped':
        return EmailEventStatusEnum.DROPPED;
      case 'delivered':
        return EmailEventStatusEnum.DELIVERED;
      default:
        return undefined;
    }
  }
}

const mapResponse = (statusCode: number) => {
  switch (statusCode) {
    case 400:
    case 401:
      return CheckIntegrationResponseEnum.BAD_CREDENTIALS;
    case 403:
      return CheckIntegrationResponseEnum.INVALID_EMAIL;
    default:
      return CheckIntegrationResponseEnum.FAILED;
  }
};
