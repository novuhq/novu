import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivitySenderTypeEnum,
  ConversationEntity,
  HumanInteractionDelivery,
  HumanInteractionEntity,
  IntegrationRepository,
  primaryHumanInteractionDelivery,
} from '@novu/dal';
import { humanInteractionCardTitle, parseToolApprovalRequestId, resolveHumanInteractionCard } from '@novu/shared';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { captureAgentWarning } from '../shared/errors/capture-agent-sentry';

/** A thread an interaction landed in, and the delivery that put it there. */
interface InteractionThread {
  conversation: ConversationEntity;
  delivery?: HumanInteractionDelivery;
}

@Injectable()
export class HumanInteractionActivityRecorder {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async recordRequest(interaction: HumanInteractionEntity): Promise<void> {
    await this.record(interaction, 'request');
  }

  async recordResponse(interaction: HumanInteractionEntity): Promise<void> {
    await this.record(interaction, 'response');
  }

  private async record(interaction: HumanInteractionEntity, suffix: 'request' | 'response'): Promise<void> {
    if (!interaction._conversationId || parseToolApprovalRequestId(interaction.requestId) !== null) {
      return;
    }

    try {
      const conversation = await this.conversationService.getConversation(
        interaction._conversationId,
        interaction._environmentId,
        interaction._organizationId
      );
      if (!conversation) {
        return;
      }

      const agentIdentifier = await this.resolveAgentIdentifier(interaction);
      if (!agentIdentifier) {
        return;
      }

      const first: InteractionThread = { conversation, delivery: primaryHumanInteractionDelivery(interaction) };
      const card = resolveHumanInteractionCard({ kind: interaction.kind, content: interaction.content });
      const title = humanInteractionCardTitle({ kind: interaction.kind, content: interaction.content });
      const contextIn = (thread: InteractionThread) => ({
        conversationId: thread.conversation._id,
        channel: this.conversationService.getPrimaryChannel(thread.conversation),
        agentIdentifier,
        environmentId: interaction._environmentId,
        organizationId: interaction._organizationId,
        interactionIdentifier: interaction.identifier,
        requestId: interaction.requestId,
        kind: interaction.kind,
        title,
        subtitle: card.subtitle,
        body: card.body,
        platformMessageId: thread.delivery?.platformMessageId,
        ...(thread === first ? {} : { inOtherThread: true }),
      });

      if (suffix === 'request') {
        const persistRequest = (thread: InteractionThread) =>
          this.conversationService.persistHumanInteractionRequest({
            ...contextIn(thread),
            actorType: ConversationActivitySenderTypeEnum.AGENT,
            actorId: agentIdentifier,
          });

        // The first thread is written before the others are looked up, so a failed lookup cannot cost it its row.
        await persistRequest(first);

        for (const thread of await this.otherThreads(interaction, first)) {
          await persistRequest(thread);
        }

        return;
      }

      const respondedBy = interaction.response?.respondedBy?.trim();
      const respondedBySubscriberId = interaction.response?.respondedBySubscriberId;
      const isHuman = Boolean(respondedBySubscriberId || respondedBy);
      const thread = (await this.answererThread(interaction, first)) ?? first;

      await this.conversationService.persistHumanInteractionResponse({
        ...contextIn(thread),
        status: interaction.status,
        optionId: interaction.response?.optionId,
        text: interaction.response?.text,
        actorType: isHuman ? ConversationActivitySenderTypeEnum.SUBSCRIBER : ConversationActivitySenderTypeEnum.SYSTEM,
        actorId: respondedBySubscriberId ?? agentIdentifier,
        actorName: respondedBy || (isHuman ? respondedBySubscriberId : 'System'),
      });
    } catch (err) {
      this.logger.warn(
        { err, interactionIdentifier: interaction.identifier, suffix },
        'Failed to persist human-interaction activity'
      );
      captureAgentWarning(err, {
        component: 'human-interaction-activity-recorder',
        operation: `persist-${suffix}`,
        agentId: interaction._agentId,
      });
    }
  }

  /**
   * The threads after the first that a send to several contacts landed in, one for each contact.
   * A delivery does not keep its thread, so each one is found again from the chat it went to.
   */
  private async otherThreads(
    interaction: HumanInteractionEntity,
    first: InteractionThread
  ): Promise<InteractionThread[]> {
    const threads: InteractionThread[] = [];

    for (const delivery of interaction.deliveries?.slice(1) ?? []) {
      const conversation = await this.findDeliveryThread(interaction, delivery);
      const seen = [first, ...threads].map((thread) => String(thread.conversation._id));

      if (conversation && !seen.includes(String(conversation._id))) {
        threads.push({ conversation, delivery });
      }
    }

    return threads;
  }

  /**
   * The thread of the contact who answered, when the send went to several and they are not the
   * first. Nothing for an answer from the first contact, or an expiry or cancel nobody gave.
   */
  private async answererThread(
    interaction: HumanInteractionEntity,
    first: InteractionThread
  ): Promise<InteractionThread | undefined> {
    const answerer = interaction.response?.respondedBySubscriberId;
    const delivery = answerer
      ? interaction.deliveries?.slice(1).find((candidate) => candidate.subscriberId === answerer)
      : undefined;

    if (!delivery) {
      return undefined;
    }

    const conversation = await this.findDeliveryThread(interaction, delivery);

    if (!conversation || String(conversation._id) === String(first.conversation._id)) {
      return undefined;
    }

    return { conversation, delivery };
  }

  /** The agent's thread on the chat a delivery went to. */
  private async findDeliveryThread(
    interaction: HumanInteractionEntity,
    delivery: HumanInteractionDelivery
  ): Promise<ConversationEntity | null> {
    const integration = await this.integrationRepository.findOne(
      {
        identifier: delivery.integrationIdentifier,
        _environmentId: interaction._environmentId,
        _organizationId: interaction._organizationId,
      },
      '_id'
    );

    if (!integration) {
      return null;
    }

    return this.conversationService.findByPlatformThread(
      interaction._environmentId,
      interaction._organizationId,
      interaction._agentId,
      integration._id,
      delivery.platformThreadId
    );
  }

  private async resolveAgentIdentifier(interaction: HumanInteractionEntity): Promise<string | undefined> {
    const agent = await this.agentRepository.findOne(
      {
        _id: interaction._agentId,
        _environmentId: interaction._environmentId,
        _organizationId: interaction._organizationId,
      },
      ['identifier']
    );

    return agent?.identifier;
  }
}
