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
import { BaseProvider, CasingEnum } from '../../../base.provider';
import { createProviderHttpClient } from '../../../utils/http';
import { WithPassthrough } from '../../../utils/types';

interface BirdEmailAttachment {
  filename: string;
  content: string;
  content_type?: string;
  content_id?: string;
}

interface BirdEmailResponse {
  id: string;
  created_at?: string;
}

export function resolveBirdBaseUrl(apiKey: string, baseUrl?: string): string {
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '');
  }

  const match = /^b[kms]_([^_]+)_/.exec(apiKey || '');

  if (match?.[1]) {
    return `https://${match[1]}.platform.bird.com`;
  }

  throw new Error(
    'Could not infer Bird region from API key. Use a key like bk_eu1_... or bk_us1_... or provide baseUrl.'
  );
}

function toBase64(file: Buffer | string | Uint8Array | null | undefined): string | undefined {
  if (!file) {
    return undefined;
  }

  if (typeof file === 'string') {
    return file;
  }

  return Buffer.from(file as Uint8Array).toString('base64');
}

function toBirdAttachment(attachment: IAttachmentOptions): BirdEmailAttachment | undefined {
  const content = toBase64(attachment.file);

  if (!content) {
    return undefined;
  }

  const mapped: BirdEmailAttachment = {
    filename: attachment.name || 'attachment',
    content,
  };

  if (attachment.mime) {
    mapped.content_type = attachment.mime;
  }

  if (attachment.cid) {
    mapped.content_id = attachment.cid;
  }

  return mapped;
}

function mapBirdEmailAttachments(attachments?: IAttachmentOptions[]): BirdEmailAttachment[] | undefined {
  if (!attachments?.length) {
    return undefined;
  }

  const mapped = attachments
    .map(toBirdAttachment)
    .filter((attachment): attachment is BirdEmailAttachment => Boolean(attachment));

  return mapped.length > 0 ? mapped : undefined;
}

function getBridgeTemplate(
  bridgeProviderData: WithPassthrough<Record<string, unknown>>
): Record<string, unknown> | undefined {
  const direct = (bridgeProviderData as Record<string, unknown>)?.template;

  if (direct && typeof direct === 'object') {
    return direct as Record<string, unknown>;
  }

  const passthrough = (bridgeProviderData as WithPassthrough<Record<string, unknown>>)?._passthrough?.body as
    | Record<string, unknown>
    | undefined;

  if (passthrough?.template && typeof passthrough.template === 'object') {
    return passthrough.template as Record<string, unknown>;
  }

  return undefined;
}

function applySharedEmailFields(
  triggerData: Record<string, unknown>,
  options: IEmailOptions,
  attachments?: BirdEmailAttachment[]
): void {
  if (options.cc) {
    triggerData.cc = options.cc;
  }

  if (options.bcc) {
    triggerData.bcc = options.bcc;
  }

  if (options.replyTo) {
    triggerData.reply_to = [options.replyTo];
  }

  if (options.headers && Object.keys(options.headers).length > 0) {
    triggerData.headers = options.headers;
  }

  if (attachments) {
    triggerData.attachments = attachments;
  }
}

function buildBirdEmailTriggerData(
  options: IEmailOptions,
  fromAddress: string,
  senderName: string | undefined,
  template: Record<string, unknown> | undefined,
  attachments?: BirdEmailAttachment[]
): Record<string, unknown> {
  const triggerData: Record<string, unknown> = {
    from: senderName ? { email: fromAddress, name: senderName } : { email: fromAddress },
    to: options.to,
  };

  applySharedEmailFields(triggerData, options, attachments);

  if (!template) {
    triggerData.subject = options.subject;

    if (options.html) {
      triggerData.html = options.html;
    }

    if (options.text) {
      triggerData.text = options.text;
    }
  }

  return triggerData;
}

function stripInlineContentForTemplate(body: Record<string, unknown>): void {
  if (!body.template) {
    return;
  }

  // Bird rejects inline content combined with a stored template.
  delete body.subject;
  delete body.html;
  delete body.text;
}

interface BirdEmailWebhookEvent {
  type: string;
  timestamp?: string;
  occurred_at?: string;
  data?: {
    email_id?: string;
    bounce_code?: number | string;
    bounce_description?: string;
    rejection_reason?: string;
    defer_reason?: string;
  } & Record<string, unknown>;
}

const BIRD_EMAIL_STATUS_MAP: Record<string, EmailEventStatusEnum> = {
  'email.accepted': EmailEventStatusEnum.SENT,
  'email.processed': EmailEventStatusEnum.SENT,
  'email.delivered': EmailEventStatusEnum.DELIVERED,
  'email.deferred': EmailEventStatusEnum.DELAYED,
  'email.bounced': EmailEventStatusEnum.BOUNCED,
  'email.out_of_band_bounce': EmailEventStatusEnum.BOUNCED,
  'email.rejected': EmailEventStatusEnum.REJECTED,
  'email.complained': EmailEventStatusEnum.COMPLAINT,
  'email.opened': EmailEventStatusEnum.OPENED,
  'email.clicked': EmailEventStatusEnum.CLICKED,
  'email.unsubscribed': EmailEventStatusEnum.UNSUBSCRIBED,
  'email.list_unsubscribed': EmailEventStatusEnum.UNSUBSCRIBED,
};

function extractBirdEmailEvents(body: unknown): BirdEmailWebhookEvent[] {
  if (Array.isArray(body)) {
    return body as BirdEmailWebhookEvent[];
  }

  if (body && typeof body === 'object' && Array.isArray((body as { events?: unknown }).events)) {
    return (body as { events: BirdEmailWebhookEvent[] }).events;
  }

  return body ? [body as BirdEmailWebhookEvent] : [];
}

function birdEmailEventResponse(data: BirdEmailWebhookEvent['data']): string | undefined {
  if (!data || typeof data !== 'object') {
    return undefined;
  }

  if (typeof data.bounce_description === 'string' && data.bounce_description.length > 0) {
    return data.bounce_description;
  }

  if (typeof data.bounce_code === 'number' || typeof data.bounce_code === 'string') {
    return String(data.bounce_code);
  }

  if (typeof data.rejection_reason === 'string' && data.rejection_reason.length > 0) {
    return data.rejection_reason;
  }

  if (typeof data.defer_reason === 'string' && data.defer_reason.length > 0) {
    return data.defer_reason;
  }

  return undefined;
}

export class BirdEmailProvider extends BaseProvider implements IEmailProvider {
  id = EmailProviderIdEnum.Bird;
  channelType = ChannelTypeEnum.EMAIL as ChannelTypeEnum.EMAIL;
  protected casing = CasingEnum.SNAKE_CASE;
  private readonly httpClient = createProviderHttpClient();

  constructor(
    private config: {
      apiKey: string;
      from: string;
      senderName?: string;
      baseUrl?: string;
    }
  ) {
    super();
  }

  private getBaseUrl(): string {
    return resolveBirdBaseUrl(this.config.apiKey, this.config.baseUrl);
  }

  async sendMessage(
    options: IEmailOptions,
    bridgeProviderData: WithPassthrough<Record<string, unknown>> = {}
  ): Promise<ISendMessageSuccessResponse> {
    const senderName = options.senderName || this.config.senderName;
    const fromAddress = options.from || this.config.from;
    const template = getBridgeTemplate(bridgeProviderData);
    const attachments = mapBirdEmailAttachments(options.attachments);
    const triggerData = buildBirdEmailTriggerData(options, fromAddress, senderName, template, attachments);
    const { body } = this.transform(bridgeProviderData, triggerData);

    stripInlineContentForTemplate(body as Record<string, unknown>);

    const { data } = await this.httpClient.post<BirdEmailResponse>(`${this.getBaseUrl()}/v1/email/messages`, body, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
    });

    return {
      id: data.id,
      date: data.created_at || new Date().toISOString(),
    };
  }

  async checkIntegration(options: IEmailOptions): Promise<ICheckIntegrationResponse> {
    try {
      await this.sendMessage({
        to: options.to,
        from: options.from || this.config.from,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        bcc: options.bcc,
      });

      return {
        success: true,
        message: 'Integrated successfully!',
        code: CheckIntegrationResponseEnum.SUCCESS,
      };
    } catch (error) {
      return {
        success: false,
        message: (error as Error)?.message,
        code: CheckIntegrationResponseEnum.FAILED,
      };
    }
  }

  getMessageId(body: BirdEmailWebhookEvent | BirdEmailWebhookEvent[]): string[] {
    return extractBirdEmailEvents(body)
      .map((event) => event?.data?.email_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);
  }

  parseEventBody(
    body: BirdEmailWebhookEvent | BirdEmailWebhookEvent[],
    identifier: string
  ): IEmailEventBody | undefined {
    const event = extractBirdEmailEvents(body).find((item) => item?.data?.email_id === identifier);

    if (!event) {
      return undefined;
    }

    const status = BIRD_EMAIL_STATUS_MAP[event.type];

    if (!status) {
      return undefined;
    }

    const response = birdEmailEventResponse(event.data);

    return {
      status,
      date: event.timestamp || event.occurred_at || new Date().toISOString(),
      externalId: identifier,
      ...(response ? { response } : {}),
      row: JSON.stringify(event),
    };
  }
}
