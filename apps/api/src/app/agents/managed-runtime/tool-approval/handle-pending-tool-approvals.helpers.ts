import { ConversationParticipant, ConversationParticipantTypeEnum } from '@novu/dal';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';

export function recoverSubscriberParticipantId(participants: ConversationParticipant[]): string | null {
  const subscriberParticipant = participants.find((entry) => entry.type === ConversationParticipantTypeEnum.SUBSCRIBER);

  if (!subscriberParticipant?.id.trim()) {
    return null;
  }

  return subscriberParticipant.id;
}

export function recoverEmailFromParticipants(
  participants: ConversationParticipant[],
  platform: AgentPlatformEnum
): string | null {
  const prefix = `${platform}:`;
  const participant = participants.find(
    (entry) => entry.type === ConversationParticipantTypeEnum.PLATFORM_USER && entry.id.startsWith(prefix)
  );

  if (!participant) {
    return null;
  }

  const email = participant.id.slice(prefix.length).trim();

  return email || null;
}
