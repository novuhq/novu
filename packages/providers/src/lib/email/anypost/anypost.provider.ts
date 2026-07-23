import { EmailProviderIdEnum } from '@novu/shared';
import {
  ChannelTypeEnum,
  CheckIntegrationResponseEnum,
  EmailEventStatusEnum,
  IAttachmentOptions,
  ICheckIntegrationResponse,
  IEmailEventBody,
  IEmailOptions,
  IEmailProvider,
  ISendMessageSuccessResponse,
} from '@novu/stateless';
import type { Attachment, EmailSendRequest, WebhookDeliveryEvent, WebhookEventType } from 'anypost';
import { Anypost, verifyWebhookSignature } from 'anypost';
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { WithPassthrough } from '../../../utils/types';

const ANYPOST_EMAIL_EVENTS: WebhookEventType[] = [
  'email.sent',
  'email.delivered',
  'email.delayed',
  'email.bounced',
  'email.complained',
  'email.suppressed',
  'email.unsubscribed',
  'email.opened',
  'email.clicked',
];

// The signed batch Anypost POSTs to a webhook endpoint (mirrors the SDK's WebhookDelivery).
interface AnypostWebhookDelivery {
  batch_id?: string;
  timestamp?: number;
  events: WebhookDeliveryEvent[];
}

export class AnypostEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Anypost;
  // Anypost's API is snake_case (reply_to, template_id, content_id), unlike the
  // camelCase vendors; bridge keys are re-cased to match, the mapped request is not.
  protected casing: CasingEnum = CasingEnum.SNAKE_CASE;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  private anypost: Anypost;

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName?: string;
      webhookSigningKey?: string;
    }
  ) {
    super();
    this.anypost = new Anypost(this.config.apiKey);
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config.senderName;
    const fromAddress = options.from || this.config.from;

    // Stored template + variables, read first-class from customData (SendGrid-style).
    const templateId = options.customData?.templateId as string | undefined;
    const variables = (options.customData?.variables ?? options.customData?.dynamicTemplateData) as
      | Record<string, unknown>
      | undefined;

    const headers = {
      ...this.correlationHeaders(options),
      ...options.headers,
    };

    const mailData: Partial<EmailSendRequest> = {
      from: senderName ? `${senderName} <${fromAddress}>` : fromAddress,
      to: options.to,
      subject: options.subject,
      cc: options.cc,
      bcc: options.bcc,
      reply_to: options.replyTo,
      attachments: this.mapAttachments(options.attachments),
      ...(Object.keys(headers).length ? { headers } : {}),
      html: options.html,
      text: options.text,
      ...(templateId ? { template_id: templateId } : {}),
      ...(variables ? { variables } : {}),
    };

    const body = this.transform<EmailSendRequest>(bridgeProviderData, mailData).body;

    // Anypost rejects template_id combined with an inline html/text body. A
    // template_id from customData OR a provider override (bridgeProviderData)
    // takes precedence, so drop any inline content once the merge is final.
    if (body.template_id) {
      delete body.html;
      delete body.text;
    }

    // Reuse Novu's transaction id as the idempotency key so retries don't double-send.
    const response = options.id
      ? await this.anypost.email.send(body, { idempotencyKey: options.id })
      : await this.anypost.email.send(body);

    return {
      id: response.id,
      date: response.created_at,
    };
  }

  async checkIntegration(_options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      // `whoami` validates the API key without sending a probe email.
      await this.anypost.whoami();

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      const err = error as { type?: string; message?: string };
      const code =
        err.type === 'authentication_error' || err.type === 'permission_error'
          ? CheckIntegrationResponseEnum.BAD_CREDENTIALS
          : CheckIntegrationResponseEnum.FAILED;

      return {
        success: false,
        message: err.message ?? 'Anypost integration check failed',
        code,
      };
    }
  }

  getMessageId(body: AnypostWebhookDelivery | WebhookDeliveryEvent | WebhookDeliveryEvent[]): string[] {
    return this.extractEvents(body)
      .map((event) => this.emailIdOf(event))
      .filter((id): id is string => Boolean(id));
  }

  parseEventBody(
    body: AnypostWebhookDelivery | WebhookDeliveryEvent | WebhookDeliveryEvent[],
    identifier: string
  ): IEmailEventBody | undefined {
    const event = this.extractEvents(body).find((item) => this.emailIdOf(item) === identifier);

    if (!event) {
      return undefined;
    }

    const status = this.getStatus(event.type);

    if (status === undefined) {
      return undefined;
    }

    const data = (event.data ?? {}) as Record<string, unknown>;
    const response =
      typeof data.bounce_classification === 'string'
        ? data.bounce_classification
        : typeof data.smtp_code === 'number'
          ? String(data.smtp_code)
          : undefined;

    return {
      status,
      date: event.occurred_at ?? new Date().toISOString(),
      externalId: this.emailIdOf(event),
      ...(typeof data.attempt === 'number' ? { attempts: data.attempt } : {}),
      ...(response ? { response } : {}),
      row: JSON.stringify(event),
    };
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
    const signature = this.getHeaderValue(headers, 'anypost-signature');
    const webhookSigningKey = this.config.webhookSigningKey;

    if (!webhookSigningKey) {
      return { success: true, message: 'Anypost signature verification is not configured' };
    }

    if (!signature) {
      return { success: false, message: 'Missing Anypost-Signature header' };
    }

    if (rawBody === undefined) {
      return { success: false, message: 'Body is undefined' };
    }

    try {
      await verifyWebhookSignature(rawBody, signature, webhookSigningKey);

      return { success: true, message: 'Anypost signature verification successful' };
    } catch (error) {
      return { success: false, message: `Error verifying signature: ${(error as Error).message}` };
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
      const webhook = await this.anypost.webhooks.create({
        name: 'Novu Inbound Webhook',
        url: configurations.webhookUrl,
        events: ANYPOST_EMAIL_EVENTS,
      });

      // The full signing secret is returned only on create; surface it for verifySignature.
      return {
        success: true,
        message: 'Anypost webhook configured successfully with signature verification enabled',
        configurations: {
          inboundWebhookEnabled: true,
          inboundWebhookSigningKey: webhook.signing_secret,
        },
      };
    } catch (error) {
      const err = error as { message?: string };

      return {
        success: false,
        message: `Error configuring Anypost webhook: ${err.message ?? 'Unknown error'}`,
      };
    }
  }

  private mapAttachments(attachments?: IAttachmentOptions[]): Attachment[] | undefined {
    return attachments
      ?.filter((attachment) => attachment.file)
      .map((attachment) => ({
        filename: attachment.name ?? 'attachment',
        // Raw bytes; the Anypost SDK base64-encodes a `Buffer`/`Uint8Array`.
        content: attachment.file as Buffer,
        content_type: attachment.mime,
        ...(attachment.cid ? { content_id: attachment.cid } : {}),
      }));
  }

  // Anypost has no custom-args bag, so Novu's correlation ids ride as X-Novu-* headers.
  private correlationHeaders(options: IEmailOptions): Record<string, string> {
    const details = (options.notificationDetails ?? {}) as Record<string, unknown>;
    const candidates: Record<string, unknown> = {
      'X-Novu-Transaction-Id': details.transactionId,
      'X-Novu-Message-Id': options.id,
      'X-Novu-Workflow-Identifier': details.workflowIdentifier,
      'X-Novu-Subscriber-Id': details.subscriberId,
    };

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(candidates)) {
      if (typeof value === 'string' && value.length > 0) {
        headers[key] = value;
      }
    }

    return headers;
  }

  private extractEvents(
    body: AnypostWebhookDelivery | WebhookDeliveryEvent | WebhookDeliveryEvent[]
  ): WebhookDeliveryEvent[] {
    if (Array.isArray(body)) {
      return body;
    }

    if (body && Array.isArray((body as AnypostWebhookDelivery).events)) {
      return (body as AnypostWebhookDelivery).events;
    }

    return body ? [body as WebhookDeliveryEvent] : [];
  }

  private emailIdOf(event: WebhookDeliveryEvent): string | undefined {
    const data = (event?.data ?? {}) as Record<string, unknown>;

    return typeof data.email_id === 'string' ? data.email_id : undefined;
  }

  private getStatus(event: string): EmailEventStatusEnum | undefined {
    switch (event) {
      case 'email.sent':
        return EmailEventStatusEnum.SENT;
      case 'email.delivered':
        return EmailEventStatusEnum.DELIVERED;
      case 'email.delayed':
        return EmailEventStatusEnum.DELAYED;
      case 'email.bounced':
        return EmailEventStatusEnum.BOUNCED;
      case 'email.complained':
        return EmailEventStatusEnum.COMPLAINT;
      case 'email.suppressed':
        // No Novu `suppressed` status; DROPPED is the closest.
        return EmailEventStatusEnum.DROPPED;
      case 'email.unsubscribed':
        return EmailEventStatusEnum.UNSUBSCRIBED;
      case 'email.opened':
        return EmailEventStatusEnum.OPENED;
      case 'email.clicked':
        return EmailEventStatusEnum.CLICKED;
      default:
        return undefined;
    }
  }

  private getHeaderValue(headers: Record<string, string>, headerName: string): string | undefined {
    const lowerHeaderName = headerName.toLowerCase();
    const key = Object.keys(headers).find((k) => k.toLowerCase() === lowerHeaderName);

    return key ? headers[key] : undefined;
  }
}
