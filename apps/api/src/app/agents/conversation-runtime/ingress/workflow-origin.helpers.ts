import type { MessageEntity } from '@novu/dal';
import type { Message } from 'chat';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { asRecord } from '../../shared/util/raw-record';

export interface WorkflowOriginData {
  notificationId: string;
  workflowIdentifier: string;
  messageId: string;
  platformMessageId: string;
  sentAt: string;
  body: string;
  payload: Record<string, unknown>;
  jobId?: string;
  stepId?: string;
  transactionId?: string;
  subscriberId?: string;
}

export interface WorkflowOriginSnapshot {
  data: WorkflowOriginData;
  source: 'hydrated' | 'existing';
}

export const WORKFLOW_ORIGIN_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

/** Platforms that reuse one conversation indefinitely — origin is re-checked on later turns, not just at open. */
export const RECHECK_WORKFLOW_ORIGIN_PLATFORMS: ReadonlySet<AgentPlatformEnum> = new Set([
  AgentPlatformEnum.WHATSAPP,
  AgentPlatformEnum.TELEGRAM,
  AgentPlatformEnum.SENDBLUE,
  AgentPlatformEnum.TEAMS,
]);

/** Conversation uses `slack:{channel}:{ts}`; Message.identifier stores bare `{channel}:{ts}`. */
export function toProviderMessageLookupKey(platformThreadId: string): string {
  return platformThreadId.startsWith('slack:') ? platformThreadId.slice('slack:'.length) : platformThreadId;
}

/** Decoded Novu Message._id from a trailing `+nv{base36}` Reply-To token on the inbound recipient. */
export function extractAgentEmailOriginToken(message: Message): string | null {
  const raw = asRecord(message.raw);
  const originToken = raw?.originToken;

  return typeof originToken === 'string' && originToken.length > 0 ? originToken.toLowerCase() : null;
}

/** Meta quote-reply wamid from `message.raw.message.context.id`. */
export function extractWhatsAppQuotedWamid(message: Message | null): string | null {
  if (!message) {
    return null;
  }

  const raw = asRecord(message.raw);
  const inbound = asRecord(raw?.message);
  const context = asRecord(inbound?.context);
  const quotedId = context?.id;

  return typeof quotedId === 'string' && quotedId.length > 0 ? quotedId : null;
}

/** Telegram quote-reply `message_id` from flat or nested `reply_to_message`. */
export function extractTelegramQuotedMessageId(message: Message | null): string | null {
  if (!message) {
    return null;
  }

  const raw = asRecord(message.raw);
  const flatReply = asRecord(raw?.reply_to_message);
  const nestedMessage = asRecord(raw?.message);
  const nestedReply = asRecord(nestedMessage?.reply_to_message);
  const quotedId = flatReply?.message_id ?? nestedReply?.message_id;

  if (typeof quotedId === 'number' && Number.isFinite(quotedId)) {
    return String(quotedId);
  }

  return typeof quotedId === 'string' && quotedId.length > 0 ? quotedId : null;
}

/** Teams quote-reply activity id from `message.raw.entities[].quotedReply.messageId`, else `replyToId`. */
export function extractTeamsQuotedActivityId(message: Message | null): string | null {
  if (!message) {
    return null;
  }

  const raw = asRecord(message.raw);
  const entities = Array.isArray(raw?.entities) ? raw.entities : [];
  for (const entity of entities) {
    const record = asRecord(entity);
    if (record?.type !== 'quotedReply') {
      continue;
    }

    const messageId = asRecord(record.quotedReply)?.messageId;
    if (typeof messageId === 'string' && messageId.length > 0) {
      return messageId;
    }
  }

  const replyToId = raw?.replyToId;

  return typeof replyToId === 'string' && replyToId.length > 0 ? replyToId : null;
}

/** Bare chat id from `telegram:{chatId}` or `telegram:{chatId}:{messageThreadId}`. */
export function extractTelegramChatIdFromThreadId(platformThreadId: string): string | null {
  if (!platformThreadId.startsWith('telegram:')) {
    return null;
  }

  const rest = platformThreadId.slice('telegram:'.length);
  const chatId = rest.split(':')[0];

  return chatId && chatId.length > 0 ? chatId : null;
}

/**
 * Sendblue 1:1 threads are `sendblue:{from}:{contact}` (exactly 3 segments). Unrecognized
 * shapes fail closed so a group thread never receives a personally-addressed payload.
 */
export function isSendblueDirectThreadId(platformThreadId: string): boolean {
  const segments = platformThreadId.split(':');

  return segments.length === 3 && segments[0] === 'sendblue' && segments[1].length > 0 && segments[2].length > 0;
}

/** Email → Message._id; WhatsApp → wamid; Sendblue → message_handle; Teams → activity id; Slack `{channel}:{ts}` → `ts`; Telegram → `{chatId}:{message_id}`. */
export function resolvePlatformMessageId(
  platform: AgentPlatformEnum,
  originMessage: MessageEntity,
  platformThreadId?: string
): string | undefined {
  if (platform === AgentPlatformEnum.EMAIL) {
    return originMessage._id;
  }

  if (!originMessage.identifier) {
    return undefined;
  }

  if (
    platform === AgentPlatformEnum.WHATSAPP ||
    platform === AgentPlatformEnum.SENDBLUE ||
    platform === AgentPlatformEnum.TEAMS
  ) {
    return originMessage.identifier;
  }

  if (platform === AgentPlatformEnum.TELEGRAM) {
    if (!platformThreadId) {
      return undefined;
    }

    const chatId = extractTelegramChatIdFromThreadId(platformThreadId);
    if (!chatId) {
      return undefined;
    }

    return `${chatId}:${originMessage.identifier}`;
  }

  // Slack-only: Message.identifier is `{channel}:{ts}`; hydration keys off the bare `ts`.
  const colon = originMessage.identifier.indexOf(':');
  if (colon <= 0 || colon === originMessage.identifier.length - 1) {
    return undefined;
  }

  return originMessage.identifier.slice(colon + 1);
}
