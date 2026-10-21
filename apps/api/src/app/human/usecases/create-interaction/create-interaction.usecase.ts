import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type AgentEmailInboxCredits,
  AgentEmailInboxQuotaService,
  AnalyticsService,
  InstrumentUsecase,
  isAgentEmailInboxQuotaExceeded,
  PinoLogger,
  shortId,
} from '@novu/application-generic';
import {
  AgentEntity,
  AgentRepository,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  HumanContactRepository,
  HumanInteractionEntity,
  HumanInteractionRepository,
  isDuplicateKeyError,
  SubscriberRepository,
} from '@novu/dal';
import {
  HumanChannelViaEnum,
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
  humanInteractionCardTitle,
  normalizeHumanTo,
} from '@novu/shared';
import { AgentConversationService } from '../../../agents/conversation-runtime/conversation/agent-conversation.service';
import { HumanInteractionActivityRecorder } from '../../../agents/human-relay/human-interaction-activity.recorder';
import { ConnectClaimTokenService } from '../../../connect/services/connect-claim-token.service';
import { KeylessEmailGateService } from '../../../keyless/keyless-email-gate.service';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import {
  type InteractionResponseDto,
  type InteractionThreadDto,
  toInteractionResponse,
} from '../../dtos/interaction-response.dto';
import { trackAgentInboxMessageSent } from '../../services/agent-inbox-analytics';
import { contactIdCandidates, explicitEmailAddress } from '../../services/explicit-email-recipient';
import { HumanDeliveryService, type ResolvedHumanTarget } from '../../services/human-delivery.service';
import { HumanInboxService, type InboxScope } from '../../services/human-inbox.service';
import {
  assertHumanCardActions,
  assertHumanPendingCap,
  buildPendingHumanInteraction,
  deliverToTargets,
  type HumanDeliveryTarget,
  toStoredContent,
} from '../../services/human-interaction-lifecycle';
import { HumanKeylessCapService, isHumanBrowserLoginAvailable } from '../../services/human-keyless-cap.service';
import { type HumanMessageCredits, HumanMessageQuotaService } from '../../services/human-message-quota.service';
import { CreateConversationInteractionCommand } from '../create-conversation-interaction/create-conversation-interaction.command';
import { CreateConversationInteraction } from '../create-conversation-interaction/create-conversation-interaction.usecase';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { CreateInteractionCommand } from './create-interaction.command';

type ExplicitRecipient = {
  subscriberId: string;
  /** Set when this send named a mailbox. Absent for a contact id. */
  explicitEmail?: string;
};

/**
 * Where the Human dashboard runs, setups are claimed there and the CLI continues with `human login`.
 * Elsewhere (self-hosted) they're claimed on the dashboard, and the CLI needs the environment's key.
 */
function keylessHumanClaimedMessage(): string {
  if (isHumanBrowserLoginAvailable()) {
    return 'This setup was moved into your Agent Inbox account. Run `npx @agentinbox/cli login` to keep using it.';
  }

  return 'This demo workspace was claimed into your Novu account. Run `npx @agentinbox/cli setup --secret-key <your Development environment key>` (or set INBOX_SECRET_KEY) to continue.';
}

@Injectable()
export class CreateInteraction {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly agentRepository: AgentRepository,
    private readonly deliveryService: HumanDeliveryService,
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly logger: PinoLogger,
    private readonly activityRecorder: HumanInteractionActivityRecorder,
    private readonly inboxQuota: AgentEmailInboxQuotaService,
    private readonly messageQuota: HumanMessageQuotaService,
    private readonly keylessCap: HumanKeylessCapService,
    private readonly inbox: HumanInboxService,
    private readonly conversationService: AgentConversationService,
    private readonly createConversationInteraction: CreateConversationInteraction,
    private readonly keylessEmailGate: KeylessEmailGateService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly analyticsService: AnalyticsService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateInteractionCommand): Promise<InteractionResponseDto> {
    const title = 'title' in command.card ? (command.card.title?.trim() ?? '') : '';
    if (!title) {
      throw new BadRequestException('`card.title` is required.');
    }

    assertHumanCardActions(command.kind, command.card);

    // Once claimed, the relay agent and channels live in the user's own
    // environment; a stale keyless credential must not read as "run setup".
    if (
      isKeylessOrganization(command.organizationId) &&
      (await this.connectClaimTokenService.isEnvironmentClaimed(command.environmentId))
    ) {
      throw new ForbiddenException(keylessHumanClaimedMessage());
    }

    const agent = await this.resolveAgent(command);
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const to = command.to === undefined ? [] : normalizeHumanTo(command.to);

    if (command.thread) {
      return this.sendIntoThread(command, agent, await this.resolveThreadEmails(command, agent, to));
    }

    if (command.anyoneMayAnswer) {
      throw new BadRequestException('`anyoneMayAnswer` needs `thread`: it is about who may answer in a thread.');
    }

    if (to.length === 0) {
      throw new BadRequestException('Pass `to` to start a new thread, or `thread` to send into an existing one.');
    }

    const recipients = await this.resolveExplicitRecipients(command, agent, to);
    await this.assertContacts(
      scope,
      recipients.map((recipient) => recipient.subscriberId)
    );

    return this.sendToContacts(command, agent, recipients, title);
  }

  /** `to` reaches contacts only: a stranger is answered in the thread they wrote in. */
  private async assertContacts(scope: InboxScope, subscriberIds: string[]): Promise<void> {
    const [stranger] = await this.inbox.findStrangers(scope, subscriberIds);

    if (stranger) {
      throw new BadRequestException(
        `"${stranger}" is not one of your contacts. Reply in the thread they wrote in with \`--thread <id>\`.`
      );
    }
  }

  /** A new thread with each contact, or the one they already have on a channel with a single thread per person. */
  private async sendToContacts(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    recipients: ExplicitRecipient[],
    title: string
  ): Promise<InteractionResponseDto> {
    const subscriberIds = [...new Set(recipients.map((recipient) => recipient.subscriberId))];
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };

    await this.keylessCap.assertWithinCap({ ...scope, agentId: agent._id, subscriberIds, via: command.via });

    await assertHumanPendingCap(this.humanInteractionRepository, {
      environmentId: command.environmentId,
      subscriberIds,
      kind: command.kind,
      errorMessage: (pendingCount, cap, subscriberId) =>
        `Human "${subscriberId}" already has ${pendingCount} pending interactions (cap ${cap}). Wait for answers or cancel stale ones with \`human interaction list\`.`,
    });

    const resolved = await this.resolveTargets(command, agent, recipients);
    const emailCount = resolved.filter((item) => item.target.platform === HumanChannelViaEnum.EMAIL).length;
    let credits: AgentEmailInboxCredits | undefined;
    let messageCredits: HumanMessageCredits | undefined;
    let emailCapError: HttpException | undefined;

    try {
      if (emailCount > 0) {
        try {
          credits = await this.inboxQuota.reserveCredits(command.organizationId, emailCount);
        } catch (err) {
          // Email-only interactions fail outright on the cap. When other channels
          // can still be reached, they go out and the email recipients fail alone.
          if (!isAgentEmailInboxQuotaExceeded(err) || emailCount === resolved.length) {
            throw err;
          }

          emailCapError = err;
        }
      }

      if (!isKeylessOrganization(command.organizationId)) {
        // Capped email recipients are not delivered, so they stay out of this
        // hold. Counting them would reject the other channels when one credit remains.
        const messageCount = emailCapError ? resolved.length - emailCount : resolved.length;
        messageCredits = await this.messageQuota.reserveCredits(command.organizationId, messageCount);
      }

      const interaction = await this.humanInteractionRepository.create(
        buildPendingHumanInteraction({
          kind: command.kind,
          content: toStoredContent(command.kind, { ...command.card, title }),
          from: command.from,
          subscriberIds,
          agentId: agent._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          ttlSeconds: command.ttlSeconds,
        })
      );

      const threads: InteractionThreadDto[] = [];
      const targets: HumanDeliveryTarget[] = resolved.map(({ subscriberId, target }) => {
        const capped = emailCapError && target.platform === HumanChannelViaEnum.EMAIL ? emailCapError : undefined;

        return {
          subscriberId,
          integrationIdentifier: target.integrationIdentifier,
          platform: target.platform,
          deliver: async () => {
            if (capped) {
              throw capped;
            }

            const sent = await this.deliveryService.deliver(interaction, target);
            messageCredits?.accept();
            const thread = await this.landInThread(scope, interaction, subscriberId, target, sent.platformThreadId);

            if (thread) {
              threads.push({ id: thread.id, unreadBefore: thread.unreadBefore });
            }

            return { ...sent, ...(thread ? { _conversationId: thread.conversationId } : {}) };
          },
        };
      });

      const deliver = () =>
        deliverToTargets(this.humanInteractionRepository, this.logger, interaction, targets, {
          logMessage: 'Human interaction delivery failed for one recipient',
        });
      const delivered = credits ? await credits.run(deliver) : await deliver();

      // Each contact gets the message in a thread of their own, so each delivery is one message sent.
      for (const { platform } of delivered.interaction.deliveries ?? []) {
        this.trackMessageSent(command, agent, platform);
      }

      await this.activityRecorder.recordRequest(delivered.interaction);

      if (delivered.interaction.status === HumanInteractionStatusEnum.DELIVERED) {
        await this.activityRecorder.recordResponse(delivered.interaction);
      }

      return toInteractionResponse(delivered.interaction, delivered.failedSubscriberIds, threads);
    } finally {
      await credits?.release();
      await messageCredits?.release();
    }
  }

  /**
   * The message is already delivered, so failing to file it under a thread must not fail the send:
   * the person still got it, and their reply opens the thread anyway.
   */
  private async landInThread(
    scope: InboxScope,
    interaction: HumanInteractionEntity,
    subscriberId: string,
    target: ResolvedHumanTarget,
    platformThreadId: string
  ): Promise<{ id: string; conversationId: string; unreadBefore: number } | null> {
    try {
      const conversation = await this.conversationService.createOrGetConversation({
        ...scope,
        agentId: interaction._agentId,
        platform: target.platform,
        integrationId: await this.inbox.findIntegrationId(scope, target.integrationIdentifier),
        platformThreadId,
        participantId: subscriberId,
        participantType: ConversationParticipantTypeEnum.SUBSCRIBER,
        platformUserId: target.platformUserId,
        firstMessageText: humanInteractionCardTitle({ kind: interaction.kind, content: interaction.content }),
        isDirectMessage: true,
      });
      const unreadBefore = await this.inbox.markSentInto(scope, conversation);
      // A direct message is not saved as an agent message, so nothing else moves the thread up the list.
      await this.inbox.touch(
        scope,
        conversation,
        humanInteractionCardTitle({ kind: interaction.kind, content: interaction.content })
      );

      return { id: conversation.identifier, conversationId: conversation._id, unreadBefore };
    } catch (err) {
      this.logger.warn(
        { err, interactionIdentifier: interaction.identifier, subscriberId },
        'Failed to file a delivered human interaction under an inbox thread'
      );

      return null;
    }
  }

  /** Into an existing thread: its contact may answer, unless `to` or `anyoneMayAnswer` says otherwise. */
  private async sendIntoThread(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    to: string[]
  ): Promise<InteractionResponseDto> {
    if (command.via) {
      throw new BadRequestException('`via` cannot be combined with `thread`: a thread already lives on one channel.');
    }

    if (command.anyoneMayAnswer && to.length > 0) {
      throw new BadRequestException(
        '`anyoneMayAnswer` cannot be combined with `to`: name who may answer, or let anyone.'
      );
    }

    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const relay = await this.inbox.resolveRelayAgent(scope, agent.identifier);
    const conversation = await this.inbox.findThread(scope, relay, command.thread as string);
    const audience =
      to.length > 0
        ? { recipients: to, anyoneMayAnswer: command.anyoneMayAnswer === true }
        : await this.threadAudience(command, scope, conversation);
    const recipients = audience.recipients;

    if (to.length > 0) {
      await this.assertThreadContacts(scope, conversation, to);
    }

    await this.keylessCap.assertWithinCap({ ...scope, agentId: agent._id, subscriberIds: recipients });

    const channel = this.inbox.primaryChannel(conversation);

    // A new thread is refused in resolveChannel. An existing email thread skips that, so check here.
    // The claim reply does not come through this path.
    if (channel.platform === HumanChannelViaEnum.EMAIL) {
      await this.keylessEmailGate.assertAllowed({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      });
    }

    const integrationIdentifier = await this.inbox.resolveIntegrationIdentifier(scope, channel);
    let messageCredits: HumanMessageCredits | undefined;
    if (!isKeylessOrganization(command.organizationId)) {
      messageCredits = await this.messageQuota.reserveCredits(command.organizationId, recipients.length);
    }

    let interaction: Awaited<ReturnType<CreateConversationInteraction['execute']>>;
    try {
      interaction = await this.createConversationInteraction.execute(
        CreateConversationInteractionCommand.create({
          ...scope,
          userId: command.userId,
          conversation,
          channel,
          agentIdentifier: relay.identifier,
          agentName: relay.name,
          integrationIdentifier,
          kind: command.kind,
          requestId: `inbox_${shortId(12)}`,
          anyoneMayAnswer: audience.anyoneMayAnswer,
          card: command.card,
          from: command.from,
          ttlSeconds: command.ttlSeconds,
          to: recipients,
        })
      );
      messageCredits?.accept(recipients.length);
    } finally {
      await messageCredits?.release();
    }

    this.trackMessageSent(command, agent, channel.platform);
    const unreadBefore = await this.inbox.markSentInto(scope, conversation);

    return toInteractionResponse(interaction, undefined, [{ id: conversation.identifier, unreadBefore }]);
  }

  /**
   * Who a send into a thread goes to when the host names nobody. A question goes to the contact the
   * thread belongs to. A thread with no contact still gets the reply: everyone already in it may answer.
   * A `tell` waits for no answer, so it is for everyone there.
   */
  private async threadAudience(
    command: CreateInteractionCommand,
    scope: InboxScope,
    conversation: ConversationEntity
  ): Promise<{ recipients: string[]; anyoneMayAnswer: boolean }> {
    if (command.anyoneMayAnswer || command.kind === HumanInteractionKindEnum.TELL) {
      return {
        recipients: this.inbox.peopleIds(conversation),
        anyoneMayAnswer: command.anyoneMayAnswer === true,
      };
    }

    const contact = await this.inbox.firstContactId(scope, conversation);

    if (!contact) {
      return { recipients: this.inbox.peopleIds(conversation), anyoneMayAnswer: true };
    }

    return { recipients: [contact], anyoneMayAnswer: false };
  }

  /**
   * `to` with `thread` names who may answer there: only a contact, and in a direct message only
   * someone who is in it. Otherwise that person never sees the question, yet their next message
   * anywhere would count as its answer.
   */
  private async assertThreadContacts(
    scope: InboxScope,
    conversation: ConversationEntity,
    subscriberIds: string[]
  ): Promise<void> {
    const [outsider] = this.inbox.outsiders(conversation, subscriberIds);

    if (outsider) {
      throw new BadRequestException(
        `"${outsider}" is not in this thread, so they would never see the message. Leave \`to\` out, or start a thread with them by passing \`to\` without \`thread\`.`
      );
    }

    const [stranger] = await this.inbox.findStrangers(scope, subscriberIds);

    if (stranger) {
      throw new BadRequestException(
        `"${stranger}" is not one of your contacts, so \`to\` cannot name them. Pass \`anyoneMayAnswer\` (\`--anyone\`) to let anyone in the thread answer.`
      );
    }
  }

  /**
   * An email address in `to` is this send's mailbox. A contact id still goes through
   * the verified-address lookup. Keyless orgs are refused before anyone is created.
   */
  private async resolveExplicitRecipients(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    to: string[]
  ): Promise<ExplicitRecipient[]> {
    const addresses = to.flatMap((value) => {
      const address = explicitEmailAddress(value);

      return address ? [address] : [];
    });

    if (addresses.length === 0) {
      return to.map((subscriberId) => ({ subscriberId }));
    }

    if (command.via && command.via !== HumanChannelViaEnum.EMAIL) {
      throw new BadRequestException('`via` must be email when `to` includes an email address.');
    }

    await this.keylessEmailGate.assertAllowed({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });

    const reserved = new Set<string>();
    const recipients: ExplicitRecipient[] = [];

    for (const value of to) {
      const address = explicitEmailAddress(value);
      const subscriberId = address ? await this.contactForExplicitEmail(command, agent, address, reserved) : value;
      const prior = recipients.find(
        (recipient) =>
          recipient.subscriberId === subscriberId &&
          (!address || !recipient.explicitEmail || recipient.explicitEmail === address)
      );
      if (prior) {
        if (address && !prior.explicitEmail) {
          prior.explicitEmail = address;
        }
        continue;
      }

      reserved.add(subscriberId);
      recipients.push(address ? { subscriberId, explicitEmail: address } : { subscriberId });
    }

    return recipients;
  }

  /**
   * `thread` never creates a contact, and an unconfirmed address cannot choose who
   * may answer. Settlement is by subscriber id, including from another conversation.
   */
  private async resolveThreadEmails(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    to: string[]
  ): Promise<string[]> {
    const recipients: string[] = [];

    for (const value of to) {
      const address = explicitEmailAddress(value);
      if (!address) {
        recipients.push(value);
        continue;
      }

      const subscriberId = await this.verifiedContactForEmail(command, agent, address);
      if (!subscriberId) {
        throw new BadRequestException(
          `"${address}" is not a confirmed address, so it cannot choose who answers in this thread. Leave \`to\` out, or pass the contact id.`
        );
      }

      recipients.push(subscriberId);
    }

    return recipients;
  }

  private async contactForExplicitEmail(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    address: string,
    reserved: ReadonlySet<string>
  ): Promise<string> {
    const existing = await this.existingContactForEmail(command, agent, address);
    if (existing) {
      return existing;
    }

    const subscriberId = await this.allocateContactId(command, address, reserved);
    await this.humanContactRepository.setDeclaredAddress({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      subscriberId,
      via: HumanChannelViaEnum.EMAIL,
      address,
    });

    const winner = await this.winningContactForEmail(command, agent, address);
    if (winner && winner !== subscriberId) {
      await this.humanContactRepository.clearDeclaredAddress({
        environmentId: command.environmentId,
        agentId: agent._id,
        subscriberId,
        via: HumanChannelViaEnum.EMAIL,
        address,
      });

      return winner;
    }

    return subscriberId;
  }

  private trackMessageSent(command: CreateInteractionCommand, agent: AgentEntity, channel: string): void {
    trackAgentInboxMessageSent(
      this.analyticsService,
      { userId: command.userId, organizationId: command.organizationId },
      { agentId: agent._id, type: command.kind, channel, source: command.analyticsSource }
    );
  }

  /**
   * The contact that keeps `address` when two first sends stored it at once.
   * The earlier declaration wins; a tie takes the smaller id so both requests agree.
   */
  private async winningContactForEmail(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    address: string
  ): Promise<string | null> {
    const matches = await this.humanContactRepository.findContactsByEmailAddress(
      command.environmentId,
      agent._id,
      address
    );
    const ranked = [...matches].sort((left, right) => {
      const leftAt = left.addresses?.[HumanChannelViaEnum.EMAIL]?.declared?.declaredAt ?? '';
      const rightAt = right.addresses?.[HumanChannelViaEnum.EMAIL]?.declared?.declaredAt ?? '';
      if (leftAt !== rightAt) {
        return leftAt < rightAt ? -1 : 1;
      }

      if (left.subscriberId === right.subscriberId) {
        return 0;
      }

      return left.subscriberId < right.subscriberId ? -1 : 1;
    });

    return ranked[0]?.subscriberId ?? null;
  }

  /** Who may answer a thread when `to` names an email: only a verified address. */
  private async verifiedContactForEmail(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    address: string
  ): Promise<string | null> {
    const matches = await this.humanContactRepository.findContactsByEmailAddress(
      command.environmentId,
      agent._id,
      address
    );
    const verified = matches.filter(
      (match) => match.addresses?.[HumanChannelViaEnum.EMAIL]?.verified?.address === address
    );
    const subscriberIds = [...new Set(verified.map((match) => match.subscriberId))];

    if (subscriberIds.length > 1) {
      throw new ConflictException(
        `${address} is verified for more than one contact (${subscriberIds.join(', ')}). Pass the contact id instead.`
      );
    }

    return subscriberIds[0] ?? null;
  }

  private async existingContactForEmail(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    address: string
  ): Promise<string | null> {
    const matches = await this.humanContactRepository.findContactsByEmailAddress(
      command.environmentId,
      agent._id,
      address
    );
    const subscriberIds = [...new Set(matches.map((match) => match.subscriberId))];

    if (subscriberIds.length > 1) {
      throw new ConflictException(
        `${address} is stored for more than one contact (${subscriberIds.join(', ')}). Pass the contact id instead.`
      );
    }

    return subscriberIds[0] ?? null;
  }

  /** Same id order as the CLI: the local part, then a short hash when that id is already someone else. */
  private async allocateContactId(
    command: CreateInteractionCommand,
    address: string,
    reserved: ReadonlySet<string>
  ): Promise<string> {
    for (const subscriberId of contactIdCandidates(address)) {
      if (reserved.has(subscriberId)) {
        continue;
      }

      if (await this.claimSubscriber(command, subscriberId)) {
        return subscriberId;
      }
    }

    throw new ConflictException(`Could not pick a contact id for ${address}. Pass a contact id instead.`);
  }

  /** Creates the subscriber with no email. Returns false when that id is already taken. */
  private async claimSubscriber(command: CreateInteractionCommand, subscriberId: string): Promise<boolean> {
    const existing = await this.subscriberRepository.findOne({
      subscriberId,
      _environmentId: command.environmentId,
    });

    if (existing) {
      return false;
    }

    try {
      await this.subscriberRepository.create({
        subscriberId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      return false;
    }

    return true;
  }

  private async resolveTargets(command: CreateInteractionCommand, agent: AgentEntity, recipients: ExplicitRecipient[]) {
    return Promise.all(
      recipients.map(async (recipient) => ({
        subscriberId: recipient.subscriberId,
        target: await this.deliveryService.resolveChannel({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentId: agent._id,
          subscriberId: recipient.subscriberId,
          ...(recipient.explicitEmail
            ? { via: HumanChannelViaEnum.EMAIL, explicitEmail: recipient.explicitEmail }
            : { via: command.via }),
        }),
      }))
    );
  }

  private async resolveAgent(command: CreateInteractionCommand): Promise<AgentEntity> {
    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;

    const agent = await this.agentRepository.findOne(
      {
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      if (identifier === DEFAULT_HUMAN_RELAY_IDENTIFIER) {
        throw new NotFoundException(
          `Relay agent "${identifier}" was not found. Run \`npx @agentinbox/cli setup\` first.`
        );
      }

      throw new NotFoundException(`Agent "${identifier}" was not found.`);
    }

    return agent;
  }
}
