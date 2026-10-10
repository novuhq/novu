import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger, shortId } from '@novu/application-generic';
import {
  AgentEntity,
  AgentRepository,
  ConversationEntity,
  ConversationParticipantTypeEnum,
  HumanInteractionEntity,
  HumanInteractionRepository,
} from '@novu/dal';
import {
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
  humanInteractionCardTitle,
  normalizeHumanTo,
} from '@novu/shared';
import { AgentConversationService } from '../../../agents/conversation-runtime/conversation/agent-conversation.service';
import { HumanInteractionActivityRecorder } from '../../../agents/human-relay/human-interaction-activity.recorder';
import { ConnectClaimTokenService } from '../../../connect/services/connect-claim-token.service';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import {
  type InteractionResponseDto,
  type InteractionThreadDto,
  toInteractionResponse,
} from '../../dtos/interaction-response.dto';
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
import { CreateConversationInteractionCommand } from '../create-conversation-interaction/create-conversation-interaction.command';
import { CreateConversationInteraction } from '../create-conversation-interaction/create-conversation-interaction.usecase';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { CreateInteractionCommand } from './create-interaction.command';

/**
 * Where the Human dashboard runs, setups are claimed there and the CLI continues with `human login`.
 * Elsewhere (self-hosted) they're claimed on the dashboard, and the CLI needs the environment's key.
 */
function keylessHumanClaimedMessage(): string {
  if (isHumanBrowserLoginAvailable()) {
    return 'This setup was moved into your Human account. Run `human login` to keep using it.';
  }

  return 'This demo workspace was claimed into your Novu account. Run `human setup --secret-key <your Development environment key>` (or set NOVU_SECRET_KEY) to continue.';
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
    private readonly keylessCap: HumanKeylessCapService,
    private readonly inbox: HumanInboxService,
    private readonly conversationService: AgentConversationService,
    private readonly createConversationInteraction: CreateConversationInteraction
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
      return this.sendIntoThread(command, agent, to);
    }

    if (command.anyoneMayAnswer) {
      throw new BadRequestException('`anyoneMayAnswer` needs `thread`: it is about who may answer in a thread.');
    }

    if (to.length === 0) {
      throw new BadRequestException('Pass `to` to start a new thread, or `thread` to send into an existing one.');
    }

    await this.assertContacts(scope, to);

    return this.sendToContacts(command, agent, to, title);
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
    subscriberIds: string[],
    title: string
  ): Promise<InteractionResponseDto> {
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };

    await this.keylessCap.assertWithinCap({ ...scope, agentId: agent._id, subscriberIds, via: command.via });

    await assertHumanPendingCap(this.humanInteractionRepository, {
      environmentId: command.environmentId,
      subscriberIds,
      kind: command.kind,
      errorMessage: (pendingCount, cap, subscriberId) =>
        `Human "${subscriberId}" already has ${pendingCount} pending interactions (cap ${cap}). Wait for answers or cancel stale ones with \`human interaction list\`.`,
    });

    const resolved = await this.resolveTargets(command, agent, subscriberIds);

    const interaction = await this.humanInteractionRepository.create(
      buildPendingHumanInteraction({
        kind: command.kind,
        content: toStoredContent(command.kind, { ...command.card, title }),
        from: command.from,
        subscriberIds,
        agentId: agent._id,
        ...scope,
        ttlSeconds: command.ttlSeconds,
      })
    );

    const threads: InteractionThreadDto[] = [];
    const targets: HumanDeliveryTarget[] = resolved.map(({ subscriberId, target }) => ({
      subscriberId,
      integrationIdentifier: target.integrationIdentifier,
      platform: target.platform,
      deliver: async () => {
        const sent = await this.deliveryService.deliver(interaction, target);
        const thread = await this.landInThread(scope, interaction, subscriberId, target, sent.platformThreadId);

        if (thread) {
          threads.push({ id: thread.id, unreadBefore: thread.unreadBefore });
        }

        return { ...sent, ...(thread ? { _conversationId: thread.conversationId } : {}) };
      },
    }));

    const delivered = await deliverToTargets(this.humanInteractionRepository, this.logger, interaction, targets, {
      logMessage: 'Human interaction delivery failed for one recipient',
    });

    await this.activityRecorder.recordRequest(delivered.interaction);

    if (delivered.interaction.status === HumanInteractionStatusEnum.DELIVERED) {
      await this.activityRecorder.recordResponse(delivered.interaction);
    }

    return toInteractionResponse(delivered.interaction, delivered.failedSubscriberIds, threads);
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
    const recipients = to.length > 0 ? to : await this.threadRecipients(command, scope, conversation);

    if (to.length > 0) {
      await this.assertThreadContacts(scope, to);
    }

    await this.keylessCap.assertWithinCap({ ...scope, agentId: agent._id, subscriberIds: recipients });

    const channel = this.inbox.primaryChannel(conversation);
    const integrationIdentifier = await this.inbox.resolveIntegrationIdentifier(scope, channel);
    const interaction = await this.createConversationInteraction.execute(
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
        anyoneMayAnswer: command.anyoneMayAnswer === true,
        card: command.card,
        from: command.from,
        ttlSeconds: command.ttlSeconds,
        to: recipients,
      })
    );

    const unreadBefore = await this.inbox.markSentInto(scope, conversation);

    return toInteractionResponse(interaction, undefined, [{ id: conversation.identifier, unreadBefore }]);
  }

  /**
   * Who a send into a thread goes to when the host names nobody. A question goes to the contact the
   * thread belongs to, the same as on any other agent; everyone in the thread only when the host says so.
   * A `tell` waits for no answer, so it is for everyone there.
   */
  private async threadRecipients(
    command: CreateInteractionCommand,
    scope: InboxScope,
    conversation: ConversationEntity
  ): Promise<string[]> {
    if (command.anyoneMayAnswer || command.kind === HumanInteractionKindEnum.TELL) {
      return this.inbox.peopleIds(conversation);
    }

    const contact = await this.inbox.firstContactId(scope, conversation);

    if (!contact) {
      throw new BadRequestException(
        'This thread has no contact in it, so nobody could answer. Pass `anyoneMayAnswer` (`--anyone`) to let anyone in the thread answer.'
      );
    }

    return [contact];
  }

  /** `to` with `thread` names who may answer there, and only a contact can be named. */
  private async assertThreadContacts(scope: InboxScope, subscriberIds: string[]): Promise<void> {
    const [stranger] = await this.inbox.findStrangers(scope, subscriberIds);

    if (stranger) {
      throw new BadRequestException(
        `"${stranger}" is not one of your contacts, so \`to\` cannot name them. Pass \`anyoneMayAnswer\` (\`--anyone\`) to let anyone in the thread answer.`
      );
    }
  }

  private async resolveTargets(command: CreateInteractionCommand, agent: AgentEntity, subscriberIds: string[]) {
    return Promise.all(
      subscriberIds.map(async (subscriberId) => ({
        subscriberId,
        target: await this.deliveryService.resolveChannel({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentId: agent._id,
          subscriberId,
          via: command.via,
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
        throw new NotFoundException(`Relay agent "${identifier}" was not found. Run \`human setup\` first.`);
      }

      throw new NotFoundException(`Agent "${identifier}" was not found.`);
    }

    return agent;
  }
}
