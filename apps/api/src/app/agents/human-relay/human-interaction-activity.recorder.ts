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

  /**
   * `answeredIn` is the conversation of the message or button press that carried the answer, and the
   * answer is recorded there. An expiry or a cancel has none, and stays in the first thread.
   */
  async recordResponse(interaction: HumanInteractionEntity, answeredIn?: ConversationEntity): Promise<void> {
    await this.record(interaction, 'response', answeredIn);
  }

  private async record(
    interaction: HumanInteractionEntity,
    suffix: 'request' | 'response',
    answeredIn?: ConversationEntity
  ): Promise<void> {
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

      const first: InteractionThread = { conversation, delivery: deliveryInto(interaction, conversation) };
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
      const thread = answeredThread(interaction, first, answeredIn);

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
   * The threads besides the first that a send to several contacts landed in, one for each contact. A
   * delivery does not keep its thread, so each one is found again from the chat it went to; the first
   * thread is the interaction's own conversation, whichever delivery that was.
   */
  private async otherThreads(
    interaction: HumanInteractionEntity,
    first: InteractionThread
  ): Promise<InteractionThread[]> {
    const deliveries = interaction.deliveries ?? [];
    if (deliveries.length < 2) {
      return [];
    }

    const threads: InteractionThread[] = [];
    const seen = new Set([String(first.conversation._id)]);

    for (const delivery of deliveries) {
      const conversation = await this.findDeliveryThread(interaction, delivery);

      if (conversation && !seen.has(String(conversation._id))) {
        seen.add(String(conversation._id));
        threads.push({ conversation, delivery });
      }
    }

    return threads;
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

/** The delivery whose card went into `conversation`, by the chat thread they share, or else the first one. */
function deliveryInto(
  interaction: HumanInteractionEntity,
  conversation: ConversationEntity
): HumanInteractionDelivery | undefined {
  const threads = new Set((conversation.channels ?? []).map((channel) => channel.platformThreadId));

  return (
    interaction.deliveries?.find((delivery) => threads.has(delivery.platformThreadId)) ??
    primaryHumanInteractionDelivery(interaction)
  );
}

/**
 * Where an answer is recorded: the conversation it came in, when that is another of this agent's
 * threads; otherwise the first thread, as for an expiry or a cancel.
 */
function answeredThread(
  interaction: HumanInteractionEntity,
  first: InteractionThread,
  answeredIn: ConversationEntity | undefined
): InteractionThread {
  if (
    !answeredIn ||
    String(answeredIn._id) === String(first.conversation._id) ||
    String(answeredIn._agentId) !== String(interaction._agentId)
  ) {
    return first;
  }

  return { conversation: answeredIn, delivery: deliveryInto(interaction, answeredIn) };
}
