import type { MessageEntity } from '@novu/dal';
import type { Message } from 'chat';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { asRecord } from '../../shared/util/raw-record';

export const WORKFLOW_ORIGIN_CONTENT_MAX_CHARS = 2_000;
export const WHATSAPP_WORKFLOW_ORIGIN_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

export function buildWorkflowOriginSummary(
  workflowIdentifier: string,
  messageContent: string,
  payload: Record<string, unknown>
): string {
  const message =
    messageContent.length > 0 ? messageContent : `A notification was sent by the ${workflowIdentifier} workflow.`;
  const additionalData =
    Object.keys(payload).length > 0 ? `\n\nAdditional data for this message:\n${JSON.stringify(payload, null, 2)}` : '';

  return `${message}${additionalData}`.slice(0, WORKFLOW_ORIGIN_CONTENT_MAX_CHARS);
}

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

export function parseEntityDate(value: string | Date | undefined | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** Email → Message._id; WhatsApp → wamid; Slack `{channel}:{ts}` → `ts`. */
export function resolvePlatformMessageId(
  platform: AgentPlatformEnum,
  originMessage: MessageEntity
): string | undefined {
  if (platform === AgentPlatformEnum.EMAIL) {
    return originMessage._id;
  }

  if (!originMessage.identifier) {
    return undefined;
  }

  if (platform === AgentPlatformEnum.WHATSAPP) {
    return originMessage.identifier;
  }

  const colon = originMessage.identifier.indexOf(':');
  if (colon <= 0 || colon === originMessage.identifier.length - 1) {
    return undefined;
  }

  return originMessage.identifier.slice(colon + 1);
}
