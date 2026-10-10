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
  ConversationStatusEnum,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { isAgentProvisionedSubscriber } from '../../agents/conversation-runtime/conversation/agent-subscriber-resolver.service';
import type {
  InboxMessageDto,
  InboxPersonDto,
  InboxPersonKind,
  InboxSender,
  InboxSendersFilter,
  InboxThreadDto,
} from '../dtos/human-inbox.dto';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../usecases/setup-human-relay/setup-human-relay.usecase';

export type InboxScope = { environmentId: string; organizationId: string };

export type InboxRelayAgent = { _id: string; identifier: string; name: string };

type InboxPeople = Map<string, InboxPersonDto>;

export interface InboxListFilters {
  read?: 'unread' | 'read';
  status?: ConversationStatusEnum;
  senders: InboxSendersFilter;
  limit: number;
  after?: string;
}

/** Pages scanned past filtered-out stranger threads before a page is returned short. */
const MAX_CONTACT_FILTER_SCANS = 5;

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
    private readonly integrationRepository: IntegrationRepository
  ) {}

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

  async findIntegrationId(scope: InboxScope, integrationIdentifier: string): Promise<string> {
    const integration = await this.integrationRepository.findOne(
      {
        identifier: integrationIdentifier,
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
      },
      '_id'
    );

    if (!integration) {
      throw new NotFoundException(`Integration "${integrationIdentifier}" no longer exists.`);
    }

    return integration._id;
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

  /**
   * What every send does to the thread it lands in: the thread is read, and open again if it was
   * resolved. Returns how many messages were unread, so the caller can tell the host what it skipped.
   */
  async markSentInto(scope: InboxScope, conversation: ConversationEntity): Promise<number> {
    const unreadBefore = await this.countUnread(scope, conversation);

    if (conversation.status === ConversationStatusEnum.RESOLVED) {
      await this.conversationRepository.updateStatus(
        scope.environmentId,
        scope.organizationId,
        conversation._id,
        ConversationStatusEnum.ACTIVE
      );
      conversation.status = ConversationStatusEnum.ACTIVE;
    }

    await this.markRead(scope, conversation);

    return unreadBefore;
  }

  /**
   * One page of threads. Whether a thread has a contact in it lives on the subscribers, not on the
   * conversation, so the `contacts` filter is applied after the query and the scan continues until
   * the page is full.
   */
  async listThreads(
    scope: InboxScope,
    agent: InboxRelayAgent,
    filters: InboxListFilters
  ): Promise<{ data: InboxThreadDto[]; next: string | null }> {
    const threads: InboxThreadDto[] = [];
    let after = filters.after;

    for (let scan = 0; scan < MAX_CONTACT_FILTER_SCANS; scan += 1) {
      const page = await this.conversationRepository.findInboxThreads({
        ...scope,
        agentId: agent._id,
        read: filters.read,
        status: filters.status,
        limit: filters.limit,
        after,
      });
      const pageThreads = await this.toThreads(scope, page.data);
      const matching =
        filters.senders === 'contacts' ? pageThreads.filter((thread) => thread.kind === 'contact') : pageThreads;

      threads.push(...matching);

      if (threads.length >= filters.limit) {
        const data = threads.slice(0, filters.limit);
        const hasMore = threads.length > filters.limit || page.next !== null;

        return { data, next: hasMore ? (data[data.length - 1]?.id ?? null) : null };
      }

      if (!page.next) {
        return { data: threads, next: null };
      }

      after = page.next;
    }

    // The scan stopped before the page filled. Hand back where it stopped, so the next call goes on from there.
    return { data: threads, next: after ?? null };
  }

  async toThreads(scope: InboxScope, conversations: ConversationEntity[]): Promise<InboxThreadDto[]> {
    const people = await this.loadPeople(scope, [...new Set(conversations.flatMap(subscriberIdsOf))]);

    return Promise.all(
      conversations.map(async (conversation) => {
        const [unreadCount, latest] = await Promise.all([
          this.countUnread(scope, conversation),
          this.activityRepository.findInboxMessages({ ...scope, conversationId: conversation._id, limit: 1 }),
        ]);

        return toThread(conversation, people, unreadCount, latest.data[0]);
      })
    );
  }

  async toThread(scope: InboxScope, conversation: ConversationEntity): Promise<InboxThreadDto> {
    const [thread] = await this.toThreads(scope, [conversation]);

    return thread;
  }

  /** The thread's messages, oldest first, each human message labelled contact or stranger. */
  async toMessages(scope: InboxScope, activities: ConversationActivityEntity[]): Promise<InboxMessageDto[]> {
    const senderIds = activities.filter(isFromSubscriber).map((activity) => activity.senderId);
    const people = await this.loadPeople(scope, [...new Set(senderIds)]);

    return activities.map((activity) => toInboxMessage(activity, people)).reverse();
  }

  /**
   * The contact a question in the thread goes to when the host names nobody. A subscriber the agent
   * runtime made up for an unknown sender is a stranger, so it is skipped.
   */
  async firstContactId(scope: InboxScope, conversation: ConversationEntity): Promise<string | undefined> {
    const subscriberIds = subscriberIdsOf(conversation);
    const people = await this.loadPeople(scope, subscriberIds);

    return subscriberIds.find((subscriberId) => people.get(subscriberId)?.kind === 'contact');
  }

  /**
   * The ids of `subscriberIds` who cannot be in the thread. Only a direct message has a known,
   * closed set of people; in a group, a contact who has not written yet is not on the thread.
   */
  outsiders(conversation: ConversationEntity, subscriberIds: string[]): string[] {
    if (conversation.isDirectMessage === false) {
      return [];
    }

    const inThread = new Set(subscriberIdsOf(conversation));

    return subscriberIds.filter((subscriberId) => !inThread.has(subscriberId));
  }

  /** Everyone in the thread: who a message sent into it without `to` is for. */
  peopleIds(conversation: ConversationEntity): string[] {
    return [...subscriberIdsOf(conversation), ...platformUserIdsOf(conversation)];
  }

  /** `to` reaches contacts only; a stranger is answered in the thread they wrote in. */
  async findStrangers(scope: InboxScope, subscriberIds: string[]): Promise<string[]> {
    const people = await this.loadPeople(scope, subscriberIds);

    return subscriberIds.filter((subscriberId) => people.get(subscriberId)?.kind === 'stranger');
  }

  async countUnread(scope: InboxScope, conversation: ConversationEntity): Promise<number> {
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

  private async loadPeople(scope: InboxScope, subscriberIds: string[]): Promise<InboxPeople> {
    if (subscriberIds.length === 0) {
      return new Map();
    }

    const subscribers = await this.subscriberRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        subscriberId: { $in: subscriberIds },
      },
      'subscriberId firstName lastName data'
    );

    return new Map(
      subscribers.map((subscriber) => {
        const name = [subscriber.firstName, subscriber.lastName].filter(Boolean).join(' ').trim();
        const kind: InboxPersonKind = isAgentProvisionedSubscriber(subscriber) ? 'stranger' : 'contact';

        return [subscriber.subscriberId, { id: subscriber.subscriberId, ...(name ? { name } : {}), kind }];
      })
    );
  }
}

function toInboxMessage(activity: ConversationActivityEntity, people: InboxPeople): InboxMessageDto {
  const interaction = readHumanInteraction(activity);
  const attachments = readAttachments(activity);
  const from = senderOf(activity);

  return {
    id: activity.identifier,
    from,
    ...(from === 'human' ? { senderKind: personKindOf(activity, people) } : {}),
    ...(activity.senderName ? { senderName: activity.senderName } : {}),
    text: activity.content ?? '',
    ...(attachments.length ? { attachments } : {}),
    ...(interaction ? { interaction } : {}),
    at: new Date(activity.createdAt).toISOString(),
  };
}

function toThread(
  conversation: ConversationEntity,
  people: InboxPeople,
  unreadCount: number,
  latest: ConversationActivityEntity | undefined
): InboxThreadDto {
  // A subscriber whose row is gone can no longer be told apart from a stranger.
  const threadPeople = [
    ...subscriberIdsOf(conversation).map(
      (subscriberId): InboxPersonDto => people.get(subscriberId) ?? { id: subscriberId, kind: 'stranger' }
    ),
    ...platformUserIdsOf(conversation).map((id): InboxPersonDto => ({ id, kind: 'stranger' })),
  ];

  return {
    id: conversation.identifier,
    channel: conversation.channels?.[0]?.platform ?? 'unknown',
    kind: threadPeople.some((person) => person.kind === 'contact') ? 'contact' : 'stranger',
    people: threadPeople,
    status: conversation.status === ConversationStatusEnum.RESOLVED ? 'resolved' : 'open',
    unreadCount,
    lastMessage: latest
      ? { text: latest.content ?? '', at: new Date(latest.createdAt).toISOString(), from: senderOf(latest) }
      : null,
    isDirectMessage: conversation.isDirectMessage !== false,
    lastActivityAt: conversation.lastActivityAt,
  };
}

function subscriberIdsOf(conversation: ConversationEntity): string[] {
  return (conversation.participants ?? [])
    .filter((participant) => participant.type === ConversationParticipantTypeEnum.SUBSCRIBER)
    .map((participant) => participant.id);
}

/** People the channel could not tie to a subscriber, as `<platform>:<their id on it>`. */
function platformUserIdsOf(conversation: ConversationEntity): string[] {
  return (conversation.participants ?? [])
    .filter((participant) => participant.type === ConversationParticipantTypeEnum.PLATFORM_USER)
    .map((participant) => participant.id);
}

function isFromSubscriber(activity: ConversationActivityEntity): boolean {
  return activity.senderType === ConversationActivitySenderTypeEnum.SUBSCRIBER;
}

/** A sender the platform could not tie to a subscriber is nobody's contact. */
function personKindOf(activity: ConversationActivityEntity, people: InboxPeople): InboxPersonKind {
  if (!isFromSubscriber(activity)) {
    return 'stranger';
  }

  return people.get(activity.senderId)?.kind ?? 'stranger';
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
