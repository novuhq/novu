import { ChannelTypeEnum, IAttachmentOptions } from '../template/template.interface';
import { ChannelData } from './channel-data.type';
import { CheckIntegrationResponseEnum } from './provider.enum';

export interface IProvider {
  id: string;
  channelType: ChannelTypeEnum;
  verifySignature?: (params: {
    rawBody: unknown;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }) => Promise<{ success: boolean; message?: string }>;
  autoConfigureInboundWebhook?: (configurations: { webhookUrl: string }) => Promise<{
    success: boolean;
    message?: string;
    configurations?: unknown;
  }>;
}

export interface IEmailAlternative {
  contentType: string;
  content: string | Buffer;
}

export interface IEmailOptions {
  to: string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
  alternatives?: IEmailAlternative[];
  attachments?: IAttachmentOptions[];
  id?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  payloadDetails?: any;
  notificationDetails?: any;
  ipPoolName?: string;
  customData?: Record<string, any>;
  headers?: Record<string, string>;
  senderName?: string;
  bridgeProviderData?: Record<string, unknown>;
}

export interface ISmsOptions {
  to: string;
  content: string;
  from?: string;
  attachments?: IAttachmentOptions[];
  id?: string;
  customData?: Record<string, any>;
  bridgeProviderData?: Record<string, unknown>;
}
export interface IPushOptions {
  target: string[];
  title: string;
  content: string;
  payload: object;
  /** Novu message id; used by some providers (e.g. APNS) for collapse-id when not set in overrides. */
  messageId?: string;
  overrides?: {
    type?: 'notification' | 'data';
    data?: { [key: string]: string };
    tag?: string;
    body?: string;
    icon?: string;
    badge?: number;
    color?: string;
    sound?: string;
    title?: string;
    bodyLocKey?: string;
    bodyLocArgs?: string;
    clickAction?: string;
    titleLocKey?: string;
    titleLocArgs?: string;
    ttl?: number;
    expiration?: number;
    priority?: 'default' | 'normal' | 'high';
    subtitle?: string;
    channelId?: string;
    categoryId?: string;
    mutableContent?: boolean;
    collapseId?: string;
    android?: { [key: string]: { [key: string]: string } | string };
    apns?: {
      headers?: { [key: string]: string };
      payload: {
        aps: { [key: string]: { [key: string]: string } | string };
      };
    };
    fcmOptions?: { analyticsLabel?: string };
  };
  subscriber: object;
  step: {
    digest: boolean;
    events: object[] | undefined;
    total_count: number | undefined;
  };
  bridgeProviderData?: Record<string, unknown>;
}

export interface IChatOptions {
  /**
   * @deprecated use channelData instead
   */
  phoneNumber?: string;
  channelData?: ChannelData;
  content: string;
  /**
   * Rich Chat: the provider-native payload the caller (worker) already produced from a
   * `CardElement` via this provider's `render()` (Slack `{ blocks }`, Teams `{ attachments }`).
   * The provider spreads it into its outgoing body; `content` carries the markdown fallback text.
   */
  nativePayload?: Record<string, unknown>;
  customData?: Record<string, any>;
  bridgeProviderData?: Record<string, unknown>;
}

/**
 * Cross-platform card content (Rich Chat), rendered natively per provider at delivery
 * (Slack Block Kit, MS Teams Adaptive Cards) and degraded to markdown text elsewhere.
 *
 * Structurally identical to `CardElement` in `@novu/shared`; duplicated here because
 * `@novu/stateless` has no dependency on `@novu/shared`. Only link buttons are supported
 * in v1; action/postback buttons may be added later.
 */
export type CardElementTextElement = {
  type: 'text';
  content: string;
  style?: 'plain' | 'bold' | 'muted';
};

export type CardElementImageElement = {
  type: 'image';
  url: string;
  alt?: string;
};

export type CardElementDividerElement = {
  type: 'divider';
};

export type CardElementLinkButtonElement = {
  type: 'link-button';
  label: string;
  url: string;
  style?: 'primary' | 'danger' | 'default';
  /** Optional author-provided id; platform serializers use it (e.g. Slack `action_id`). */
  id?: string;
};

export type CardElementActionsElement = {
  type: 'actions';
  children: CardElementLinkButtonElement[];
};

export type CardElementChild =
  | CardElementTextElement
  | CardElementImageElement
  | CardElementDividerElement
  | CardElementActionsElement;

export type CardElement = {
  type: 'card';
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  children: CardElementChild[];
};

export enum ChatRenderValidationLevelEnum {
  WARNING = 'warning',
  ERROR = 'error',
}

/**
 * A deterministic, post-render platform-limit finding (e.g. "Slack section text
 * truncated to 3000 chars", "WhatsApp only delivers the first 3 buttons"). Warnings
 * are non-blocking; the worker logs them and still delivers.
 */
export interface IChatRenderValidation {
  level: ChatRenderValidationLevelEnum;
  code: string;
  message: string;
}

/**
 * Result of serializing a `CardElement` for a specific chat provider.
 * `nativePayload` is the provider-native payload (Slack blocks, Teams Adaptive Card, ...),
 * `content` is the provider-flavored text used as `text` and on card-less surfaces.
 */
export interface IChatRenderResult {
  nativePayload: Record<string, unknown>;
  content: string;
  validation: IChatRenderValidation[];
}

export interface ISendMessageSuccessResponse {
  id?: string;
  ids?: string[];
  date?: string;
}

export enum EmailEventStatusEnum {
  OPENED = 'opened',
  REJECTED = 'rejected',
  SENT = 'sent',
  DEFERRED = 'deferred',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  DROPPED = 'dropped',
  CLICKED = 'clicked',
  BLOCKED = 'blocked',
  SPAM = 'spam',
  UNSUBSCRIBED = 'unsubscribed',
  DELAYED = 'delayed',
  COMPLAINT = 'complaint',
}

export enum PushEventStatusEnum {
  DELIVERED = 'delivered',
  OPENED = 'opened',
  DISMISSED = 'dismissed',
  CLICKED = 'clicked',
  FAILED = 'failed',
}

export enum SmsEventStatusEnum {
  CREATED = 'created',
  DELIVERED = 'delivered',
  ACCEPTED = 'accepted',
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  UNDELIVERED = 'undelivered',
  REJECTED = 'rejected',
}

export interface IEventBody {
  status: EmailEventStatusEnum | SmsEventStatusEnum | PushEventStatusEnum;
  date: string;
  externalId?: string;
  attempts?: number;
  response?: string;
  // Contains the raw content from the provider webhook
  row?: string;
}

export interface IEmailEventBody extends IEventBody {
  status: EmailEventStatusEnum;
}

export interface ISMSEventBody extends IEventBody {
  status: SmsEventStatusEnum;
}

export interface IPushEventBody extends IEventBody {
  status: PushEventStatusEnum;
}

export interface IEmailProvider extends IProvider {
  channelType: ChannelTypeEnum.EMAIL;

  sendMessage(
    options: IEmailOptions,
    bridgeProviderData: Record<string, unknown>
  ): Promise<ISendMessageSuccessResponse>;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (body: any | any[], identifier: string, eventIndex?: number) => IEmailEventBody | undefined;

  checkIntegration?: (options: IEmailOptions) => Promise<ICheckIntegrationResponse>;
}

export interface ISmsProvider extends IProvider {
  sendMessage(options: ISmsOptions, bridgeProviderData: Record<string, unknown>): Promise<ISendMessageSuccessResponse>;

  channelType: ChannelTypeEnum.SMS;

  getMessageId?: (body: any) => string[];

  parseEventBody?: (body: any | any[], identifier: string, eventIndex?: number) => ISMSEventBody | undefined;
}

export interface IChatProvider extends IProvider {
  sendMessage(options: IChatOptions, bridgeProviderData: Record<string, unknown>): Promise<ISendMessageSuccessResponse>;
  channelType: ChannelTypeEnum.CHAT;

  /**
   * Rich Chat: serialize a `CardElement` DSL into this provider's native payload.
   * Rich providers (Slack, Teams, ...) return a native `nativePayload`; providers without
   * a native serializer omit this method and the caller falls back to markdown text.
   * Async because the underlying Chat SDK serializers are ESM-only and lazily imported.
   * Pure/side-effect free: the handler invokes it once before `sendMessage` (forwarding
   * `nativePayload`/`content` via `IChatOptions`) and the editor preview reuses it.
   */
  render?: (card: CardElement) => Promise<IChatRenderResult>;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (body: any | any[], identifier: string, eventIndex?: number) => unknown | undefined;
}

export interface IPushProvider extends IProvider {
  isTokenInvalid?: (errorMessage: string) => boolean;

  sendMessage(options: IPushOptions, bridgeProviderData: Record<string, unknown>): Promise<ISendMessageSuccessResponse>;

  channelType: ChannelTypeEnum.PUSH;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (body: any | any[], identifier: string, eventIndex?: number) => unknown | undefined;
}

export interface IToolOptions {
  content: string;
  customData?: Record<string, unknown>;
  bridgeProviderData?: Record<string, unknown>;
  /**
   * Per-subscriber routing data resolved from a `ChannelEndpoint` + `ChannelConnection.auth`.
   * Providers that route per-subscriber (e.g. PagerDuty) read fields off this union;
   * providers that route from env-level credentials ignore it.
   */
  channelData?: ChannelData;
  /**
   * IDs threaded through so providers can derive a stable, retry-safe dedup key
   * (e.g. PagerDuty's Events API v2 dedup_key). All three together are the finest-grained
   * "logical send" identity: unique per trigger, stable across worker retries of the same job.
   */
  transactionId?: string;
  subscriberId?: string;
  stepId?: string;
}

export interface IToolProvider extends IProvider {
  sendMessage(options: IToolOptions, bridgeProviderData: Record<string, unknown>): Promise<ISendMessageSuccessResponse>;

  channelType: ChannelTypeEnum.TOOL;

  getMessageId?: (body: any | any[]) => string[];

  parseEventBody?: (body: any | any[], identifier: string, eventIndex?: number) => unknown | undefined;
}

export type ChannelProvider = IEmailProvider | ISmsProvider | IChatProvider | IPushProvider | IToolProvider;

export interface ICheckIntegrationResponse {
  success: boolean;
  message: string;
  code: CheckIntegrationResponseEnum;
}
