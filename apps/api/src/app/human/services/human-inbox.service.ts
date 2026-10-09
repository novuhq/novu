import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentRepository,
  ConversationActivityEntity,
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationChannel,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  ConversationRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import type { InboxMessageDto, InboxSender, InboxThreadDto } from '../dtos/human-inbox.dto';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../usecases/setup-human-relay/setup-human-relay.usecase';
import { HumanKeylessCapService } from './human-keyless-cap.service';

export type InboxScope = { environmentId: string; organizationId: string };

export type InboxRelayAgent = { _id: string; identifier: string; name: string };

/**
 * The Human inbox: the conversations of a `human_relay` agent, read as threads an agent pulls,
 * answers and closes. Read state is a per-conversation cursor (`lastReadAt`).
 */
@Injectable()
export class HumanInboxService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly activityRepository: ConversationActivityRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly keylessCap: HumanKeylessCapService
  ) {}

  /** Inbox sends draw on the same keyless demo allowance as `POST /human/interactions`. */
  async assertCanSend(scope: InboxScope, agent: InboxRelayAgent, conversation: ConversationEntity): Promise<void> {
    const subscriberId = subscriberIdOf(conversation);

    await this.keylessCap.assertWithinCap({
      ...scope,
      agentId: agent._id,
      subscriberIds: subscriberId ? [subscriberId] : [],
    });
  }

  async resolveRelayAgent(scope: InboxScope, agentIdentifier?: string): Promise<InboxRelayAgent> {
    const identifier = agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;
    const agent = await this.agentRepository.findOne(
      { identifier, _environmentId: scope.environmentId, _organizationId: scope.organizationId },
      ['_id', 'identifier', 'name', 'runtime']
    );

    if (!agent || agent.runtime !== 'human_relay') {
      throw new NotFoundException(`Relay agent "${identifier}" was not found. Run \`human setup\` first.`);
    }

    return { _id: agent._id, identifier: agent.identifier, name: agent.name };
  }

  async findThread(scope: InboxScope, agent: InboxRelayAgent, identifier: string): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findByAgentAndIdentifier(
      scope.environmentId,
      scope.organizationId,
      agent._id,
      identifier
    );

    if (!conversation) {
      throw new NotFoundException(`Inbox thread "${identifier}" was not found.`);
    }

    return conversation;
  }

  primaryChannel(conversation: ConversationEntity): ConversationChannel {
    const channel = conversation.channels?.[0];
    if (!channel) {
      throw new NotFoundException(`Inbox thread "${conversation.identifier}" has no channel to reply on.`);
    }

    return channel;
  }

  async resolveIntegrationIdentifier(scope: InboxScope, channel: ConversationChannel): Promise<string> {
    const integration = await this.integrationRepository.findOne(
      {
        _id: channel._integrationId,
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
      },
      'identifier'
    );

    if (!integration?.identifier) {
      throw new NotFoundException(`The ${channel.platform} integration of this thread no longer exists.`);
    }

    return integration.identifier;
  }

  /**
   * Reads the thread up to the human message it had when it was loaded, so a message that arrives
   * while the agent is looking stays unread.
   */
  async markRead(scope: InboxScope, conversation: ConversationEntity): Promise<void> {
    const readUpTo = conversation.lastHumanMessageAt;
    if (!readUpTo) {
      return;
    }

    await this.conversationRepository.markRead(scope.environmentId, scope.organizationId, conversation._id, readUpTo);

    if (!conversation.lastReadAt || conversation.lastReadAt < readUpTo) {
      conversation.lastReadAt = readUpTo;
    }
  }

  async toThreads(scope: InboxScope, conversations: ConversationEntity[]): Promise<InboxThreadDto[]> {
    const subscriberIds = [...new Set(conversations.flatMap((conversation) => subscriberIdOf(conversation) ?? []))];
    const names = await this.loadSubscriberNames(scope, subscriberIds);

    return Promise.all(
      conversations.map(async (conversation) => {
        const [unreadCount, latest] = await Promise.all([
          this.countUnread(scope, conversation),
          this.activityRepository.findInboxMessages({ ...scope, conversationId: conversation._id, limit: 1 }),
        ]);

        return toThread(conversation, names, unreadCount, latest.data[0]);
      })
    );
  }

  async toThread(scope: InboxScope, conversation: ConversationEntity): Promise<InboxThreadDto> {
    const [thread] = await this.toThreads(scope, [conversation]);

    return thread;
  }

  private async countUnread(scope: InboxScope, conversation: ConversationEntity): Promise<number> {
    if (!conversation.lastHumanMessageAt) {
      return 0;
    }

    if (conversation.lastReadAt && conversation.lastReadAt >= conversation.lastHumanMessageAt) {
      return 0;
    }

    return this.activityRepository.countInboundMessagesSince({
      ...scope,
      conversationId: conversation._id,
      since: conversation.lastReadAt,
    });
  }

  private async loadSubscriberNames(scope: InboxScope, subscriberIds: string[]): Promise<Map<string, string>> {
    if (subscriberIds.length === 0) {
      return new Map();
    }

    const subscribers = await this.subscriberRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        subscriberId: { $in: subscriberIds },
      },
      'subscriberId firstName lastName'
    );

    return new Map(
      subscribers.flatMap((subscriber) => {
        const name = [subscriber.firstName, subscriber.lastName].filter(Boolean).join(' ').trim();

        return name ? [[subscriber.subscriberId, name] as [string, string]] : [];
      })
    );
  }
}

export function toInboxMessage(activity: ConversationActivityEntity): InboxMessageDto {
  const interaction = readHumanInteraction(activity);
  const attachments = readAttachments(activity);

  return {
    id: activity.identifier,
    from: senderOf(activity),
    ...(activity.senderName ? { senderName: activity.senderName } : {}),
    text: activity.content ?? '',
    ...(attachments.length ? { attachments } : {}),
    ...(interaction ? { interaction } : {}),
    at: new Date(activity.createdAt).toISOString(),
  };
}

function toThread(
  conversation: ConversationEntity,
  names: Map<string, string>,
  unreadCount: number,
  latest: ConversationActivityEntity | undefined
): InboxThreadDto {
  const subscriberId = subscriberIdOf(conversation);
  const name = subscriberId ? names.get(subscriberId) : undefined;

  return {
    id: conversation.identifier,
    channel: conversation.channels?.[0]?.platform ?? 'unknown',
    from: subscriberId ? { subscriberId, ...(name ? { name } : {}) } : null,
    status: conversation.status,
    unreadCount,
    lastMessage: latest
      ? { text: latest.content ?? '', at: new Date(latest.createdAt).toISOString(), from: senderOf(latest) }
      : null,
    isDirectMessage: conversation.isDirectMessage !== false,
    lastActivityAt: conversation.lastActivityAt,
  };
}

function subscriberIdOf(conversation: ConversationEntity): string | undefined {
  return conversation.participants?.find(
    (participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER
  )?.id;
}

function senderOf(activity: ConversationActivityEntity): InboxSender {
  switch (activity.senderType) {
    case ConversationActivitySenderTypeEnum.SUBSCRIBER:
    case ConversationActivitySenderTypeEnum.PLATFORM_USER:
      return 'human';
    case ConversationActivitySenderTypeEnum.AGENT:
      return 'agent';
    case ConversationActivitySenderTypeEnum.SYSTEM:
      return 'system';
    default: {
      const exhaustive: never = activity.senderType;

      return exhaustive;
    }
  }
}

function readHumanInteraction(activity: ConversationActivityEntity): InboxMessageDto['interaction'] {
  if (
    activity.type !== ConversationActivityTypeEnum.HUMAN_INTERACTION_REQUEST &&
    activity.type !== ConversationActivityTypeEnum.HUMAN_INTERACTION_RESPONSE
  ) {
    return undefined;
  }

  const raw = activity.richContent?.humanInteraction as
    | { interactionIdentifier?: string; kind?: string; status?: string }
    | undefined;

  if (!raw?.interactionIdentifier || !raw.kind) {
    return undefined;
  }

  return { id: raw.interactionIdentifier, kind: raw.kind, ...(raw.status ? { status: raw.status } : {}) };
}

function readAttachments(activity: ConversationActivityEntity): NonNullable<InboxMessageDto['attachments']> {
  const raw = activity.richContent?.attachments;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((attachment: { type?: string; name?: string; mimeType?: string }) => ({
    ...(attachment.type ? { type: attachment.type } : {}),
    ...(attachment.name ? { name: attachment.name } : {}),
    ...(attachment.mimeType ? { mimeType: attachment.mimeType } : {}),
  }));
}
