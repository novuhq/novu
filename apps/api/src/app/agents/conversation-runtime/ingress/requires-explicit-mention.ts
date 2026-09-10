import { type ConversationEntity, type ConversationParticipant, ConversationParticipantTypeEnum } from '@novu/dal';
import { AGENT_REPLY_METADATA_KEYS, AgentReplyPolicyEnum } from '@novu/shared';
import type { Message, Thread } from 'chat';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { asRecord } from '../../shared/util/raw-record';
import { isNestedSharedThread } from './platform-thread-id';

export interface ExplicitMentionContext {
  replyPolicy: AgentReplyPolicyEnum;
  platform: AgentPlatformEnum;
  conversationExists: boolean;
  platformThreadId: string;
  humanParticipantCount: number;
  smartMentionRequired?: boolean;
}

export function countHumanParticipants(conversation: ConversationEntity | null | undefined): number {
  if (!conversation) {
    return 0;
  }

  return conversation.participants.filter((participant) => participant.type !== ConversationParticipantTypeEnum.AGENT)
    .length;
}

export function conversationHasSmartMentionRequired(conversation: ConversationEntity | null | undefined): boolean {
  return conversation?.metadata?.[AGENT_REPLY_METADATA_KEYS.smartMentionRequired] === true;
}

export function followsNestedThreadWithoutMention(context: ExplicitMentionContext): boolean {
  switch (context.replyPolicy) {
    case AgentReplyPolicyEnum.MENTION_ONLY:
      return false;
    case AgentReplyPolicyEnum.AUTO_REPLY:
      return true;
    case AgentReplyPolicyEnum.SMART:
      return context.humanParticipantCount <= 1 && context.smartMentionRequired !== true;
    default: {
      const exhaustiveCheck: never = context.replyPolicy;

      return exhaustiveCheck;
    }
  }
}

export function requiresExplicitMention(thread: Thread, message: Message, context: ExplicitMentionContext): boolean {
  if (thread.isDM) {
    return false;
  }

  if (message.isMention === true) {
    return false;
  }

  if (
    followsNestedThreadWithoutMention(context) &&
    context.conversationExists &&
    isNestedSharedThread(context.platform, thread, context.platformThreadId)
  ) {
    return false;
  }

  return true;
}

export type SmartExclusiveThreadEndReason = 'join' | 'teammate_mention';

export interface SmartExclusiveThreadEndedParams {
  replyPolicy: AgentReplyPolicyEnum;
  participantsSnapshot: ConversationParticipant[];
  subscriberId: string | null;
  platform: AgentPlatformEnum;
  platformUserId: string | undefined;
  botUserId: string | undefined;
  message: Message;
}

export function detectSmartExclusiveThreadEnded(
  params: SmartExclusiveThreadEndedParams
): SmartExclusiveThreadEndReason | null {
  if (params.replyPolicy !== AgentReplyPolicyEnum.SMART) {
    return null;
  }

  const humans = params.participantsSnapshot.filter(
    (participant) => participant.type !== ConversationParticipantTypeEnum.AGENT
  );

  if (humans.length !== 1) {
    return null;
  }

  const platformIdentity = `${params.platform}:${params.platformUserId}`;
  const [incumbent] = humans;
  const isJoin = incumbent.id !== params.subscriberId && incumbent.id !== platformIdentity;

  if (isJoin) {
    return 'join';
  }

  if (messageMentionsOtherHuman(params.message, params.platform, params.botUserId)) {
    return 'teammate_mention';
  }

  return null;
}

export function messageContainsUserMention(message: Message, platform: AgentPlatformEnum): boolean {
  return collectMentionedUserIds(message, platform).length > 0;
}

export function messageMentionsOtherHuman(
  message: Message,
  platform: AgentPlatformEnum,
  botUserId: string | undefined
): boolean {
  const authorUserId = message.author?.userId;
  const mentionedIds = collectMentionedUserIds(message, platform).filter((id) => id !== authorUserId);

  if (mentionedIds.length === 0) {
    return false;
  }

  if (botUserId) {
    return mentionedIds.some((id) => !isBotUserId(id, botUserId));
  }

  /*
   * The SDK's `isMention` is authoritative for whether the bot was mentioned.
   * If the workspace bot id could not be resolved, one unique mention may be
   * the bot; two guarantee that at least one other user was also mentioned.
   */
  return message.isMention !== true || mentionedIds.length >= 2;
}

function collectMentionedUserIds(message: Message, platform: AgentPlatformEnum): string[] {
  switch (platform) {
    case AgentPlatformEnum.SLACK:
      return uniqueIds(collectSlackMentionedUserIds(message));
    case AgentPlatformEnum.TEAMS:
      return uniqueIds(collectTeamsMentionedUserIds(message));
    case AgentPlatformEnum.WHATSAPP:
    case AgentPlatformEnum.EMAIL:
    case AgentPlatformEnum.TELEGRAM:
    case AgentPlatformEnum.SENDBLUE:
    case AgentPlatformEnum.WEB_CHAT:
      return [];
    default: {
      const exhaustiveCheck: never = platform;

      return exhaustiveCheck;
    }
  }
}

function collectSlackMentionedUserIds(message: Message): string[] {
  const ids = collectSlackBlockMentionedUserIds(message);

  for (const text of slackMentionTexts(message)) {
    for (const match of text.matchAll(/<@([UW][A-Z0-9]+)(?:\|[^>]*)?>/g)) {
      ids.push(match[1]);
    }
  }

  return ids;
}

function collectSlackBlockMentionedUserIds(message: Message): string[] {
  const raw = asRecord(message.raw);
  const event = asRecord(raw?.event) ?? raw;
  const blocks = Array.isArray(event?.blocks) ? event.blocks : [];
  const ids: string[] = [];

  for (const block of blocks) {
    collectSlackUserElements(block, ids);
  }

  return ids;
}

function collectSlackUserElements(value: unknown, ids: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSlackUserElements(item, ids);
    }

    return;
  }

  const record = asRecord(value);
  if (!record) {
    return;
  }

  if (record.type === 'user' && typeof record.user_id === 'string' && record.user_id.length > 0) {
    ids.push(record.user_id);
  }

  for (const child of Object.values(record)) {
    if (Array.isArray(child) || asRecord(child)) {
      collectSlackUserElements(child, ids);
    }
  }
}

function slackMentionTexts(message: Message): string[] {
  const texts: string[] = [];

  if (typeof message.text === 'string' && message.text.length > 0) {
    texts.push(message.text);
  }

  const raw = asRecord(message.raw);
  const event = asRecord(raw?.event) ?? raw;
  const rawText = event?.text;

  if (typeof rawText === 'string' && rawText.length > 0) {
    texts.push(rawText);
  }

  return texts;
}

function collectTeamsMentionedUserIds(message: Message): string[] {
  const raw = asRecord(message.raw);
  const entities = Array.isArray(raw?.entities) ? raw.entities : [];
  const ids: string[] = [];

  for (const entity of entities) {
    const record = asRecord(entity);
    if (record?.type !== 'mention') {
      continue;
    }

    const mentionedId = asRecord(record.mentioned)?.id;
    if (typeof mentionedId === 'string' && mentionedId.length > 0) {
      ids.push(mentionedId);
    }
  }

  return ids;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function isBotUserId(mentionedId: string, botUserId: string | undefined): boolean {
  if (!botUserId) {
    return false;
  }

  return mentionedId === botUserId || mentionedId.endsWith(`:${botUserId}`);
}
