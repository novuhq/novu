import { Injectable } from '@nestjs/common';
import { decryptCredentials } from '@novu/application-generic';
import { ConversationRepository, type IntegrationEntity } from '@novu/dal';

/** Meta lets a business send free-form messages for this long after the person's last message. */
export const WHATSAPP_CUSTOMER_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Whether WhatsApp can write to a person right now, and when that changes. */
export type WhatsAppWindow = {
  open: boolean;
  /** When they last wrote to the business number, as far as Agent Inbox knows. */
  lastMessageAt?: string;
  /** When the window shuts (or shut): 24 hours after `lastMessageAt`. */
  closesAt?: string;
};

/** A person reached on one WhatsApp Business number: their wa_id, and when they proved it, which opened a window too. */
export type WhatsAppWindowTarget = {
  /** The person's wa_id: their number as digits, as WhatsApp addresses them. */
  waId: string;
  /** When they sent the code that proved the number. That message is never stored, but it opened a window. */
  provedAt?: string;
};

/**
 * Meta's 24-hour customer service window, read from what the inbound path already keeps: the newest message a
 * person wrote on their WhatsApp thread with the business number (`Conversation.lastHumanMessageAt`), across every
 * agent on it, or the code message that proved their number, whichever is later. Nothing is written here.
 */
@Injectable()
export class WhatsAppWindowService {
  constructor(private readonly conversationRepository: ConversationRepository) {}

  async describe(
    scope: { environmentId: string; organizationId: string },
    integration: Pick<IntegrationEntity, '_id' | 'credentials'>,
    target: WhatsAppWindowTarget
  ): Promise<WhatsAppWindow> {
    return (await this.describeMany(scope, integration, [target])).get(target.waId) ?? { open: false };
  }

  /** The same for many people on one business number, in one read. Keyed by wa_id. */
  async describeMany(
    scope: { environmentId: string; organizationId: string },
    integration: Pick<IntegrationEntity, '_id' | 'credentials'>,
    targets: WhatsAppWindowTarget[]
  ): Promise<Map<string, WhatsAppWindow>> {
    const phoneNumberId = businessPhoneNumberIdOf(integration);
    const threadIdOf = (waId: string) => (phoneNumberId ? `whatsapp:${phoneNumberId}:${waId}` : undefined);
    const threadIds = targets.map((target) => threadIdOf(target.waId)).filter((id): id is string => Boolean(id));
    const lastMessages = await this.conversationRepository.findLastHumanMessageAtByPlatformThreads(
      scope.environmentId,
      scope.organizationId,
      String(integration._id),
      threadIds
    );

    const now = Date.now();
    const windows = new Map<string, WhatsAppWindow>();
    for (const target of targets) {
      const threadId = threadIdOf(target.waId);
      const lastMessageAt = latestOf(threadId ? lastMessages.get(threadId) : undefined, target.provedAt);
      windows.set(target.waId, windowFrom(lastMessageAt, now));
    }

    return windows;
  }
}

/** The business number's Meta id, which every WhatsApp thread id with it starts with. */
function businessPhoneNumberIdOf(integration: Pick<IntegrationEntity, 'credentials'>): string | undefined {
  const id = decryptCredentials(integration.credentials ?? {}).phoneNumberIdentification;

  return typeof id === 'string' && id.trim() ? id.trim() : undefined;
}

function latestOf(...times: Array<string | undefined>): string | undefined {
  return times
    .filter((time): time is string => Boolean(time) && Number.isFinite(Date.parse(time as string)))
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
}

export function windowFrom(lastMessageAt: string | undefined, now = Date.now()): WhatsAppWindow {
  if (!lastMessageAt) {
    return { open: false };
  }

  const closesAt = Date.parse(lastMessageAt) + WHATSAPP_CUSTOMER_WINDOW_MS;

  return { open: closesAt > now, lastMessageAt, closesAt: new Date(closesAt).toISOString() };
}
