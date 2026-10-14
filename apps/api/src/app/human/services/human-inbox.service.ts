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
  type HumanInteractionEntity,
  HumanInteractionRepository,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  HUMAN_INTERACTION_MAX_RECIPIENTS,
  HumanChannelViaEnum,
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
  isHumanCardElementContent,
  mintHumanOptions,
  resolveHumanInteractionCard,
} from '@novu/shared';
import { isAgentProvisionedSubscriber } from '../../agents/conversation-runtime/conversation/agent-subscriber-resolver.service';
import { parseHumanActionId } from '../../agents/human-relay/human-action-id';
import type {
  InboxAttachmentDto,
  InboxCardDto,
  InboxCardPresentationStyle,
  InboxCardStateDto,
  InboxCountsResponseDto,
  InboxMessageDto,
  InboxPersonDto,
  InboxPersonKind,
  InboxSender,
  InboxSendersFilter,
  InboxTab,
  InboxThreadDetailsDto,
  InboxThreadDto,
  InboxThreadState,
} from '../dtos/human-inbox.dto';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../usecases/setup-human-relay/setup-human-relay.usecase';
import { HumanDeliveryService } from './human-delivery.service';
import { readHumanContentActions } from './human-interaction-lifecycle';

export type InboxScope = { environmentId: string; organizationId: string };

export type InboxRelayAgent = { _id: string; identifier: string; name: string };

type InboxPeople = Map<string, InboxPersonDto>;

export interface InboxListFilters {
  read?: 'unread' | 'read';
  status?: ConversationStatusEnum;
  senders: InboxSendersFilter;
  /** Only threads waiting on a person or on the agent. */
  waiting?: boolean;
  channel?: string;
  search?: string;
  limit: number;
  after?: string;
}

export interface InboxCountFilters {
  senders: InboxSendersFilter;
  tab?: InboxTab;
  channel?: string;
  search?: string;
}

/** Where a thread stands, and who it waits on when it waits on a person. */
type InboxStanding = { unreadCount: number; state: InboxThreadState; waitingOn?: string[] };

type PendingQuestion = Pick<HumanInteractionEntity, 'subscriberIds' | 'anyoneMayAnswer' | '_conversationId'>;

type InboxMessageContext = {
  people: InboxPeople;
  agent: InboxRelayAgent;
  interactions: Map<string, HumanInteractionEntity>;
};

/** Pages scanned past filtered-out stranger threads before a page is returned short. */
const MAX_CONTACT_FILTER_SCANS = 5;

/**
 * The newest threads the counts and the search look at. Both need facts that are not on the thread
 * itself (deleted messages, open questions, message text), so they read the threads instead of
 * asking the database to count; an inbox with more threads than this gets a lower bound.
 */
const INBOX_SCAN_LIMIT = 500;

/** Threads read for the counts or a search, newest first, and whether older ones were left out. */
type InboxScan = { conversations: ConversationEntity[]; capped: boolean };

type InboxPage = { data: ConversationEntity[]; next: string | null };

const PREVIEW_MAX_LENGTH = 200;

/** The channels the inbox page always offers, also while no thread is on them. */
const INBOX_CHANNELS: readonly string[] = Object.values(HumanChannelViaEnum);

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
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly deliveryService: HumanDeliveryService
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

  /** Marks the thread as just used, so it sorts first in the list and previews what was sent. */
  async touch(scope: InboxScope, conversation: ConversationEntity, preview: string): Promise<void> {
    await this.conversationRepository.touchPreview(
      scope.environmentId,
      scope.organizationId,
      conversation._id,
      preview
    );
  }

  /**
   * Opens a thread again when someone wrote in it after it was loaded and before it was resolved, so
   * resolving cannot bury a message the host has not seen. Says whether it reopened.
   */
  async reopenIfWrittenSince(scope: InboxScope, conversation: ConversationEntity): Promise<boolean> {
    const { modified } = await this.conversationRepository.update(
      {
        _id: conversation._id,
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        status: ConversationStatusEnum.RESOLVED,
        lastHumanMessageAt: conversation.lastHumanMessageAt
          ? { $gt: conversation.lastHumanMessageAt }
          : { $exists: true },
      },
      { $set: { status: ConversationStatusEnum.ACTIVE } }
    );

    return modified > 0;
  }

  /**
   * What every send does to the thread it lands in: the thread is read, and open again if it was
   * resolved. Returns how many messages were unread, so the caller can tell the host what it skipped.
   */
  async markSentInto(scope: InboxScope, conversation: ConversationEntity): Promise<number> {
    const unreadBefore = await this.countUnread(scope, conversation);

    // Not only when the loaded copy says resolved: another request may have resolved it since.
    await this.conversationRepository.update(
      {
        _id: conversation._id,
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        status: ConversationStatusEnum.RESOLVED,
      },
      { $set: { status: ConversationStatusEnum.ACTIVE } }
    );
    conversation.status = ConversationStatusEnum.ACTIVE;

    await this.markRead(scope, conversation);

    return unreadBefore;
  }

  /**
   * One page of threads. Whether a thread has a contact in it lives on the subscribers, and whether
   * it has anything unread depends on deleted messages, so both filters are applied after the query
   * and the scan continues until the page is full.
   */
  async listThreads(
    scope: InboxScope,
    agent: InboxRelayAgent,
    filters: InboxListFilters
  ): Promise<{ data: InboxThreadDto[]; next: string | null }> {
    const threads: InboxThreadDto[] = [];
    let after = filters.after;
    const loadPage = await this.threadPager(scope, agent, filters);

    if (!loadPage) {
      return { data: [], next: null };
    }

    for (let scan = 0; scan < MAX_CONTACT_FILTER_SCANS; scan += 1) {
      const page = await loadPage(after);
      const pageThreads = await this.toThreads(scope, page.data);
      const matching = pageThreads.filter(
        (thread) =>
          (filters.senders !== 'contacts' || thread.kind === 'contact') &&
          (filters.read !== 'unread' || thread.unreadCount > 0) &&
          (filters.read !== 'read' || thread.unreadCount === 0) &&
          (!filters.waiting || isWaiting(thread.state))
      );

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

  /**
   * What loads the candidate threads of a page, given the identifier of the last thread of the page
   * before. Null when `filters.after` is not a thread of this agent.
   */
  private async threadPager(
    scope: InboxScope,
    agent: InboxRelayAgent,
    filters: InboxListFilters
  ): Promise<((after?: string) => Promise<InboxPage>) | null> {
    const { status, channel, limit } = filters;

    if (!filters.search) {
      return (after) =>
        this.conversationRepository.findInboxThreads({
          ...scope,
          agentId: agent._id,
          // The query tells read from unread by time alone, so a thread whose only new message was
          // deleted looks unread to it. It narrows `unread` to candidates; the count in `listThreads`
          // decides, and decides alone for `read`, so every thread is in exactly one of the two.
          read: filters.read === 'unread' ? 'unread' : undefined,
          status,
          channel,
          limit,
          after,
        });
    }

    // A search has already loaded the threads it found, so its pages are cut from those. The last
    // thread of the page before may match the search no longer, so it is looked up on its own.
    const { conversations: found } = await this.searchThreads(scope, agent, filters.search);
    const firstCursor = filters.after
      ? await this.conversationRepository.findByAgentAndIdentifier(
          scope.environmentId,
          scope.organizationId,
          agent._id,
          filters.after
        )
      : undefined;

    if (firstCursor === null) {
      return null;
    }

    return async (after) =>
      pageOf(found, {
        status,
        channel,
        limit,
        // Past the first scan the cursor is a thread the search found.
        after: found.find(({ identifier }) => identifier === after) ?? firstCursor,
      });
  }

  /**
   * How many threads each tab and each channel holds. A tab is counted within the chosen channel and
   * a channel within the chosen tab, so each number is what picking that tab or channel would list.
   */
  async countThreads(
    scope: InboxScope,
    agent: InboxRelayAgent,
    filters: InboxCountFilters
  ): Promise<InboxCountsResponseDto> {
    const tabs: Record<InboxTab, number> = { all: 0, unread: 0, waiting: 0, resolved: 0 };
    const channels: InboxCountsResponseDto['channels'] = { all: 0 };
    for (const channel of INBOX_CHANNELS) {
      channels[channel] = 0;
    }

    // A search only looks at the newest threads, so its counts are a lower bound once there are more.
    const { conversations, capped } = filters.search
      ? await this.searchThreads(scope, agent, filters.search)
      : await this.newestThreads(scope, agent);
    const [standings, people] = await Promise.all([
      this.resolveStandings(scope, conversations),
      this.loadPeople(scope, [...new Set(conversations.flatMap(subscriberIdsOf))]),
    ]);

    for (const conversation of conversations) {
      if (filters.senders === 'contacts' && !hasContact(conversation, people)) {
        continue;
      }

      const { state } = standings.get(conversation._id) as InboxStanding;
      const channel = channelOf(conversation);

      if (!filters.channel || filters.channel === channel) {
        for (const tab of Object.keys(tabs) as InboxTab[]) {
          tabs[tab] += Number(isInTab(state, tab));
        }
      }

      if (isInTab(state, filters.tab ?? 'all')) {
        channels.all += 1;
        channels[channel] = (channels[channel] ?? 0) + 1;
      }
    }

    return { tabs, channels, capped };
  }

  async toThreads(scope: InboxScope, conversations: ConversationEntity[]): Promise<InboxThreadDto[]> {
    const standings = await this.resolveStandings(scope, conversations);
    const waitedOn = [...standings.values()].flatMap((standing) => standing.waitingOn ?? []);
    const people = await this.loadPeople(scope, [...new Set([...conversations.flatMap(subscriberIdsOf), ...waitedOn])]);

    return Promise.all(
      conversations.map(async (conversation) => {
        const latest = await this.activityRepository.findInboxMessages({
          ...scope,
          conversationId: conversation._id,
          limit: 1,
        });

        return toThread(conversation, people, standings.get(conversation._id) as InboxStanding, latest.data[0]);
      })
    );
  }

  async toThread(scope: InboxScope, conversation: ConversationEntity): Promise<InboxThreadDto> {
    const [thread] = await this.toThreads(scope, [conversation]);

    return thread;
  }

  /**
   * The thread's messages, oldest first: each human message labelled contact or stranger, and each
   * card with what was sent and what became of it.
   */
  async toMessages(
    scope: InboxScope,
    agent: InboxRelayAgent,
    activities: ConversationActivityEntity[]
  ): Promise<InboxMessageDto[]> {
    const interactionIds = activities.flatMap((activity) => readHumanInteraction(activity)?.id ?? []);
    const found = await this.humanInteractionRepository.findByIdentifiers(scope.environmentId, scope.organizationId, [
      ...new Set(interactionIds),
    ]);
    const interactions = new Map(found.map((interaction) => [interaction.identifier, interaction]));
    const senderIds = activities.filter(isFromSubscriber).map((activity) => activity.senderId);
    const answererIds = found.flatMap((interaction) => [
      ...interaction.subscriberIds,
      ...(interaction.response?.respondedBySubscriberId ? [interaction.response.respondedBySubscriberId] : []),
    ]);
    const people = await this.loadPeople(scope, [...new Set([...senderIds, ...answererIds])]);

    return activities.map((activity) => toInboxMessage(activity, { people, agent, interactions })).reverse();
  }

  /** The "Details" block of a thread: who it is with, whether they are verified on its channel, and its numbers. */
  async toDetails(
    scope: InboxScope,
    agent: InboxRelayAgent,
    conversation: ConversationEntity,
    thread: InboxThreadDto
  ): Promise<InboxThreadDetailsDto> {
    const person = thread.people.find((candidate) => candidate.kind === 'contact') ?? thread.people[0];
    const [messageCount, verified] = await Promise.all([
      this.activityRepository.countInboxMessages({ ...scope, conversationId: conversation._id }),
      person?.kind === 'contact' ? this.isVerifiedOn(scope, agent, person.id, thread.channel) : false,
    ]);

    return {
      threadId: thread.id,
      channel: thread.channel,
      contact: person ? { ...person, verified } : null,
      status: thread.state,
      openedAt: thread.openedAt,
      lastReadAt: thread.lastReadAt,
      agent: { identifier: agent.identifier, name: agent.name },
      messageCount,
    };
  }

  /** A contact is verified on a channel once the agent can reach them there: connected chat, or confirmed email. */
  private async isVerifiedOn(
    scope: InboxScope,
    agent: InboxRelayAgent,
    subscriberId: string,
    channel: string
  ): Promise<boolean> {
    const reachability = await this.deliveryService.describeReachabilityForMany({
      ...scope,
      agentId: agent._id,
      subscribers: [{ subscriberId }],
    });

    return (reachability.get(subscriberId)?.targets ?? []).some((target) => target.platform === channel);
  }

  /**
   * Where each thread stands. Unread wins over a pending question, and a question over who spoke
   * last, so a thread is in exactly one state.
   */
  private async resolveStandings(
    scope: InboxScope,
    conversations: ConversationEntity[]
  ): Promise<Map<string, InboxStanding>> {
    const open = conversations.filter((conversation) => conversation.status !== ConversationStatusEnum.RESOLVED);
    const [unreadCounts, pending] = await Promise.all([
      Promise.all(conversations.map((conversation) => this.countUnread(scope, conversation))),
      this.humanInteractionRepository.findPendingByConversations(
        scope.environmentId,
        scope.organizationId,
        open.map((conversation) => conversation._id),
        new Date().toISOString()
      ),
    ]);
    const unreadById = new Map(conversations.map((conversation, index) => [conversation._id, unreadCounts[index]]));
    // The rows come oldest first, so the first one seen is the question that has waited longest.
    const oldestQuestion = new Map<string, PendingQuestion>();
    for (const question of pending) {
      const conversationId = String(question._conversationId);

      if (!oldestQuestion.has(conversationId)) {
        oldestQuestion.set(conversationId, question);
      }
    }

    const undecided = open.filter(
      (conversation) => !unreadById.get(conversation._id) && !oldestQuestion.has(conversation._id)
    );
    const latestSenders = await this.activityRepository.findLatestInboxSenderTypes({
      ...scope,
      conversationIds: undecided.map((conversation) => conversation._id),
    });

    return new Map(
      conversations.map((conversation): [string, InboxStanding] => {
        const unreadCount = unreadById.get(conversation._id) ?? 0;
        const question = oldestQuestion.get(conversation._id);

        if (conversation.status === ConversationStatusEnum.RESOLVED) {
          return [conversation._id, { unreadCount, state: 'resolved' }];
        }

        if (unreadCount > 0) {
          return [conversation._id, { unreadCount, state: 'unread' }];
        }

        if (question) {
          const waitingOn = question.anyoneMayAnswer ? [] : question.subscriberIds;

          return [conversation._id, { unreadCount, state: 'waiting_on_person', waitingOn }];
        }

        const latestSender = latestSenders.get(conversation._id);
        const personWasLast =
          latestSender === ConversationActivitySenderTypeEnum.SUBSCRIBER ||
          latestSender === ConversationActivitySenderTypeEnum.PLATFORM_USER;

        return [conversation._id, { unreadCount, state: personWasLast ? 'waiting_on_you' : 'open' }];
      })
    );
  }

  /** The newest `INBOX_SCAN_LIMIT` threads, newest first. `capped` tells that there are older ones. */
  private async newestThreads(scope: InboxScope, agent: InboxRelayAgent): Promise<InboxScan> {
    const { data, next } = await this.conversationRepository.findInboxThreads({
      ...scope,
      agentId: agent._id,
      limit: INBOX_SCAN_LIMIT,
    });

    return { conversations: data, capped: next !== null };
  }

  /**
   * The threads, out of the newest `INBOX_SCAN_LIMIT`, whose subject, people or messages contain
   * `text`, newest first. `capped` tells that older threads were not looked at.
   */
  private async searchThreads(scope: InboxScope, agent: InboxRelayAgent, text: string): Promise<InboxScan> {
    const { conversations, capped } = await this.newestThreads(scope, agent);
    const [people, withText] = await Promise.all([
      this.loadPeople(scope, [...new Set(conversations.flatMap(subscriberIdsOf))]),
      this.activityRepository.findConversationIdsWithText({
        ...scope,
        conversationIds: conversations.map((conversation) => conversation._id),
        text,
      }),
    ]);
    const needle = text.toLowerCase();
    const idsWithText = new Set(withText);
    const found = conversations.filter(
      (conversation) =>
        idsWithText.has(conversation._id) ||
        [conversation.title, fromLabel(peopleOf(conversation, people))].some((value) =>
          value?.toLowerCase().includes(needle)
        )
    );

    return { conversations: found, capped };
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
    // An interaction lists at most this many people. The message is posted once in the thread either
    // way, so in a busier group the list is cut rather than the send refused.
    return [...subscriberIdsOf(conversation), ...platformUserIdsOf(conversation)].slice(
      0,
      HUMAN_INTERACTION_MAX_RECIPIENTS
    );
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

function toInboxMessage(activity: ConversationActivityEntity, context: InboxMessageContext): InboxMessageDto {
  const { people, agent } = context;
  const reference = readHumanInteraction(activity);
  const interaction = reference ? context.interactions.get(reference.id) : undefined;
  const attachments = readAttachments(activity);
  const from = senderOf(activity);
  const person = isFromSubscriber(activity) ? people.get(activity.senderId) : undefined;
  const senderName = person?.name ?? activity.senderName;

  return {
    id: activity.identifier,
    from,
    ...(from === 'human'
      ? {
          direction: 'in' as const,
          senderKind: personKindOf(activity, people),
          sender: {
            id: activity.senderId,
            ...(senderName ? { name: senderName } : {}),
            kind: personKindOf(activity, people),
          },
        }
      : {}),
    ...(from === 'agent'
      ? { direction: 'out' as const, sender: { id: agent.identifier, name: agent.name, kind: 'agent' as const } }
      : {}),
    ...(activity.senderName ? { senderName: activity.senderName } : {}),
    channel: activity.platform,
    text: activity.content ?? '',
    ...(attachments.length ? { attachments } : {}),
    ...(reference
      ? { interaction: interaction ? { ...reference, status: statusOf(interaction, new Date()) } : reference }
      : {}),
    ...(interaction ? { card: toCard(interaction, activity.platform, people) } : {}),
    at: new Date(activity.createdAt).toISOString(),
  };
}

function toThread(
  conversation: ConversationEntity,
  people: InboxPeople,
  standing: InboxStanding,
  latest: ConversationActivityEntity | undefined
): InboxThreadDto {
  const threadPeople = peopleOf(conversation, people);

  return {
    id: conversation.identifier,
    channel: channelOf(conversation),
    kind: threadPeople.some((person) => person.kind === 'contact') ? 'contact' : 'stranger',
    people: threadPeople,
    status: conversation.status === ConversationStatusEnum.RESOLVED ? 'resolved' : 'open',
    state: standing.state,
    ...(standing.waitingOn
      ? { waitingOn: standing.waitingOn.map((id): InboxPersonDto => people.get(id) ?? { id, kind: 'stranger' }) }
      : {}),
    from: fromLabel(threadPeople),
    subject: conversation.title ?? '',
    preview: previewOf(conversation, latest),
    unreadCount: standing.unreadCount,
    lastMessage: latest
      ? { text: latest.content ?? '', at: new Date(latest.createdAt).toISOString(), from: senderOf(latest) }
      : null,
    isDirectMessage: conversation.isDirectMessage !== false,
    openedAt: new Date(conversation.createdAt).toISOString(),
    lastReadAt: conversation.lastReadAt ?? null,
    lastActivityAt: conversation.lastActivityAt,
  };
}

/** A subscriber whose row is gone can no longer be told apart from a stranger. */
function peopleOf(conversation: ConversationEntity, people: InboxPeople): InboxPersonDto[] {
  return [
    ...subscriberIdsOf(conversation).map(
      (subscriberId): InboxPersonDto => people.get(subscriberId) ?? { id: subscriberId, kind: 'stranger' }
    ),
    ...platformUserIdsOf(conversation).map((id): InboxPersonDto => ({ id, kind: 'stranger' })),
  ];
}

function hasContact(conversation: ConversationEntity, people: InboxPeople): boolean {
  return subscriberIdsOf(conversation).some((subscriberId) => people.get(subscriberId)?.kind === 'contact');
}

/**
 * One page out of threads that are already loaded, newest first: what `findInboxThreads` does in the
 * database. `after` is the last thread of the previous page, which need not be one of `conversations`.
 */
function pageOf(
  conversations: ConversationEntity[],
  params: { status?: ConversationStatusEnum; channel?: string; limit: number; after?: ConversationEntity }
): InboxPage {
  const { after } = params;
  const rest = conversations.filter(
    (conversation) =>
      (!after || isListedAfter(conversation, after)) &&
      (!params.status || conversation.status === params.status) &&
      (!params.channel || channelOf(conversation) === params.channel)
  );
  const data = rest.slice(0, params.limit);

  return { data, next: rest.length > params.limit ? (data[data.length - 1]?.identifier ?? null) : null };
}

/** Whether `conversation` comes after `cursor` in the inbox: older activity, and on a tie the older thread. */
function isListedAfter(conversation: ConversationEntity, cursor: ConversationEntity): boolean {
  const activityAt = new Date(conversation.lastActivityAt).getTime();
  const cursorActivityAt = new Date(cursor.lastActivityAt).getTime();

  return activityAt < cursorActivityAt || (activityAt === cursorActivityAt && conversation._id < cursor._id);
}

function channelOf(conversation: ConversationEntity): string {
  return conversation.channels?.[0]?.platform ?? 'unknown';
}

function fromLabel(people: InboxPersonDto[]): string {
  return people.map(nameOf).join(', ');
}

function nameOf(person: InboxPersonDto): string {
  return person.name ?? person.id;
}

/** A card previews as its title: the stored text of its row is a log line, "Waiting for answer: …". */
function previewOf(conversation: ConversationEntity, latest: ConversationActivityEntity | undefined): string {
  const card = latest?.richContent?.humanInteraction as { title?: string } | undefined;
  const text = card?.title || latest?.content || conversation.lastMessagePreview || '';

  return text.slice(0, PREVIEW_MAX_LENGTH);
}

function isWaiting(state: InboxThreadState): boolean {
  return state === 'waiting_on_person' || state === 'waiting_on_you';
}

function isInTab(state: InboxThreadState, tab: InboxTab): boolean {
  switch (tab) {
    case 'all':
      return true;
    case 'unread':
      return state === 'unread';
    case 'waiting':
      return isWaiting(state);
    case 'resolved':
      return state === 'resolved';
    default: {
      const exhaustive: never = tab;

      return exhaustive;
    }
  }
}

/** Expiry is lazy, so an overdue interaction can still be stored as pending. */
function statusOf(interaction: HumanInteractionEntity, now: Date): HumanInteractionStatusEnum {
  const overdue = interaction.status === HumanInteractionStatusEnum.PENDING && new Date(interaction.expiresAt) < now;

  return overdue ? HumanInteractionStatusEnum.EXPIRED : interaction.status;
}

function toCard(interaction: HumanInteractionEntity, channel: string, people: InboxPeople): InboxCardDto {
  const chrome = cardChromeOf(interaction);
  const body = chrome.body ?? postedCardText(interaction);

  return {
    id: interaction.identifier,
    kind: interaction.kind,
    title: chrome.title,
    ...(chrome.subtitle ? { subtitle: chrome.subtitle } : {}),
    ...(body ? { body } : {}),
    ...(chrome.icon ? { icon: chrome.icon } : {}),
    ...(interaction.fromLabel ? { requestedBy: interaction.fromLabel } : {}),
    ...(interaction.kind === HumanInteractionKindEnum.APPROVE ? { buttons: approveButtons(chrome) } : {}),
    ...('options' in chrome ? { options: chrome.options } : {}),
    presentation: presentationOf(interaction.kind, channel, Boolean(chrome.subtitle || body || chrome.icon)),
    state: cardStateOf(interaction, channel, people),
    expiresAt: interaction.expiresAt,
  };
}

/**
 * The card as the lifecycle resolves it. A card posted as an element keeps its controls in its
 * buttons, where the resolver does not look, so they are read from there.
 */
function cardChromeOf(interaction: HumanInteractionEntity): ReturnType<typeof resolveHumanInteractionCard> {
  const chrome = resolveHumanInteractionCard(interaction);

  if (!isHumanCardElementContent(interaction.content)) {
    return chrome;
  }

  const actions = readHumanContentActions(interaction.content);

  if (interaction.kind === HumanInteractionKindEnum.CHOOSE) {
    return { ...chrome, options: mintHumanOptions(actions.options) };
  }

  if (interaction.kind === HumanInteractionKindEnum.APPROVE) {
    const extraActions = mintHumanOptions(actions.extraActions);

    return {
      ...chrome,
      ...postedApproveLabels(interaction.content.card.children),
      ...(extraActions.length ? { extraActions } : {}),
    };
  }

  return chrome;
}

/** A node of a posted card, as far as its buttons go. */
type PostedCardNode = { type?: string; id?: string; label?: string; children?: PostedCardNode[] };

/** The Approve and Deny labels of a posted card, read from its two buttons wherever they sit. */
function postedApproveLabels(nodes: PostedCardNode[]): { approveLabel?: string; denyLabel?: string } {
  const labels: { approveLabel?: string; denyLabel?: string } = {};

  for (const node of nodes) {
    const label = node.label?.trim();
    const action = node.id ? (parseHumanActionId(node.id)?.type ?? node.id) : undefined;

    if ((node.type === 'button' || node.type === 'link-button') && label) {
      if (action === 'approve') {
        labels.approveLabel = label;
      } else if (action === 'deny') {
        labels.denyLabel = label;
      }
    }

    Object.assign(labels, postedApproveLabels(node.children ?? []));
  }

  return labels;
}

/** A card posted as an element keeps its text in its children rather than in a `body`. */
function postedCardText(interaction: HumanInteractionEntity): string | undefined {
  if (!isHumanCardElementContent(interaction.content)) {
    return undefined;
  }

  const text = interaction.content.card.children
    .flatMap((child) => (child.type === 'text' ? [child.content.trim()] : []))
    .filter(Boolean)
    .join('\n');

  return text || undefined;
}

/** Deny first, then Approve, then the extras: the order the card shows them in. */
function approveButtons(chrome: ReturnType<typeof resolveHumanInteractionCard>): Array<{ id: string; label: string }> {
  return [
    { id: 'deny', label: ('denyLabel' in chrome && chrome.denyLabel) || 'Deny' },
    { id: 'approve', label: ('approveLabel' in chrome && chrome.approveLabel) || 'Approve' },
    ...('extraActions' in chrome && chrome.extraActions ? chrome.extraActions : []),
  ];
}

/** How the card builder renders each kind: buttons to press, a message to reply to, or nothing to do. */
function presentationOf(
  kind: HumanInteractionKindEnum,
  channel: string,
  hasCardContent: boolean
): InboxCardDto['presentation'] {
  const style = presentationStyleOf(kind, hasCardContent);
  const words: Record<InboxCardPresentationStyle, string> = {
    buttons: 'buttons',
    reply: 'reply',
    card: channel === HumanChannelViaEnum.SLACK ? 'blocks' : 'card',
    text: 'message',
  };

  return { channel, style, label: `${capitalize(channel)} ${words[style]}` };
}

function presentationStyleOf(kind: HumanInteractionKindEnum, hasCardContent: boolean): InboxCardPresentationStyle {
  switch (kind) {
    case HumanInteractionKindEnum.APPROVE:
    case HumanInteractionKindEnum.CHOOSE:
      return 'buttons';
    case HumanInteractionKindEnum.ASK:
      return 'reply';
    default:
      // A plain `tell` is sent as text and becomes a card only with a subtitle, a body or an icon.
      return hasCardContent ? 'card' : 'text';
  }
}

function cardStateOf(interaction: HumanInteractionEntity, channel: string, people: InboxPeople): InboxCardStateDto {
  const status = statusOf(interaction, new Date());
  const { response } = interaction;

  if (status === HumanInteractionStatusEnum.PENDING) {
    const waitingOn = interaction.anyoneMayAnswer
      ? []
      : interaction.subscriberIds.map((id): InboxPersonDto => people.get(id) ?? { id, kind: 'stranger' });
    const who = waitingOn.length ? waitingOn.map(nameOf).join(', ') : 'anyone in the thread';

    return { status, label: `waiting for ${who}`, waitingOn };
  }

  const responderId = response?.respondedBySubscriberId;
  const responderName = response?.respondedBy?.trim() || (responderId ? people.get(responderId)?.name : undefined);
  const name = responderName ?? responderId;
  const optionLabel = response?.optionId ? optionLabelOf(interaction, response.optionId) : undefined;

  return {
    status,
    label: settledLabel(status, { name, optionLabel, channel: capitalize(channel) }),
    ...(name ? { respondedBy: { ...(responderId ? { id: responderId } : {}), name } } : {}),
    ...(response?.respondedAt ? { respondedAt: response.respondedAt } : {}),
    ...(response?.optionId ? { optionId: response.optionId } : {}),
    ...(optionLabel ? { optionLabel } : {}),
    ...(response?.text ? { text: response.text } : {}),
  };
}

function settledLabel(
  status: HumanInteractionStatusEnum,
  settled: { name?: string; optionLabel?: string; channel: string }
): string {
  const by = settled.name ? ` by ${settled.name}` : '';

  switch (status) {
    case HumanInteractionStatusEnum.APPROVED:
      return `${settled.optionLabel ?? 'Approved'}${by} in ${settled.channel}`;
    case HumanInteractionStatusEnum.DENIED:
      return `Denied${by} in ${settled.channel}`;
    case HumanInteractionStatusEnum.ANSWERED:
      if (settled.optionLabel) {
        return settled.name ? `${settled.name} picked ${settled.optionLabel}` : `Picked ${settled.optionLabel}`;
      }

      return `Answered${by} in ${settled.channel}`;
    case HumanInteractionStatusEnum.DELIVERED:
      return 'no reply needed';
    case HumanInteractionStatusEnum.CANCELED:
      return 'canceled by the agent';
    default:
      return 'expired, nobody answered';
  }
}

/** The label of a picked option or a pressed extra button. Plain Approve and Deny have none of their own. */
function optionLabelOf(interaction: HumanInteractionEntity, optionId: string): string | undefined {
  const chrome = cardChromeOf(interaction);
  const choices = [
    ...('options' in chrome ? chrome.options : []),
    ...('extraActions' in chrome && chrome.extraActions ? chrome.extraActions : []),
  ];

  return choices.find((choice) => choice.id === optionId)?.label;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
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

function readAttachments(activity: ConversationActivityEntity): InboxAttachmentDto[] {
  const raw = activity.richContent?.attachments;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((attachment: InboxAttachmentDto) => ({
    ...(attachment.type ? { type: attachment.type } : {}),
    ...(attachment.name ? { name: attachment.name } : {}),
    ...(attachment.mimeType ? { mimeType: attachment.mimeType } : {}),
    ...(typeof attachment.size === 'number' ? { size: attachment.size } : {}),
  }));
}
