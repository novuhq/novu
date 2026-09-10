import { type ConversationEntity, type ConversationParticipant, ConversationParticipantTypeEnum } from '@novu/dal';
import { AgentReplyPolicyEnum } from '@novu/shared';
import type { Message, Thread } from 'chat';
import type { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { isNestedSharedThread } from './platform-thread-id';

export interface ExplicitMentionContext {
  replyPolicy: AgentReplyPolicyEnum;
  platform: AgentPlatformEnum;
  conversationExists: boolean;
  platformThreadId: string;
  humanParticipantCount: number;
}

export function countHumanParticipants(conversation: ConversationEntity | null | undefined): number {
  if (!conversation) {
    return 0;
  }

  return conversation.participants.filter((participant) => participant.type !== ConversationParticipantTypeEnum.AGENT)
    .length;
}

export function followsNestedThreadWithoutMention(context: ExplicitMentionContext): boolean {
  switch (context.replyPolicy) {
    case AgentReplyPolicyEnum.MENTION_ONLY:
      return false;
    case AgentReplyPolicyEnum.AUTO_REPLY:
      return true;
    case AgentReplyPolicyEnum.SMART:
      return context.humanParticipantCount <= 1;
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

export interface SmartThreadJoinParams {
  replyPolicy: AgentReplyPolicyEnum;
  participantsSnapshot: ConversationParticipant[];
  subscriberId: string | null;
  platform: AgentPlatformEnum;
  platformUserId: string | undefined;
}

export function detectSmartThreadJoin(params: SmartThreadJoinParams): boolean {
  if (params.replyPolicy !== AgentReplyPolicyEnum.SMART) {
    return false;
  }

  const humans = params.participantsSnapshot.filter(
    (participant) => participant.type !== ConversationParticipantTypeEnum.AGENT
  );

  if (humans.length !== 1) {
    return false;
  }

  const platformIdentity = `${params.platform}:${params.platformUserId}`;
  const [incumbent] = humans;

  return incumbent.id !== params.subscriberId && incumbent.id !== platformIdentity;
}
