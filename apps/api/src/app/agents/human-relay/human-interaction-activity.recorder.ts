import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivitySenderTypeEnum,
  HumanInteractionEntity,
  primaryHumanInteractionDelivery,
} from '@novu/dal';
import { humanInteractionCardTitle, parseToolApprovalRequestId, resolveHumanInteractionCard } from '@novu/shared';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { captureAgentWarning } from '../shared/errors/capture-agent-sentry';

@Injectable()
export class HumanInteractionActivityRecorder {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly agentRepository: AgentRepository,
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

      const channel = this.conversationService.getPrimaryChannel(conversation);
      const card = resolveHumanInteractionCard({ kind: interaction.kind, content: interaction.content });
      const title = humanInteractionCardTitle({ kind: interaction.kind, content: interaction.content });
      const delivery = primaryHumanInteractionDelivery(interaction);
      const context = {
        conversationId: conversation._id,
        channel,
        agentIdentifier,
        environmentId: interaction._environmentId,
        organizationId: interaction._organizationId,
        interactionIdentifier: interaction.identifier,
        requestId: interaction.requestId,
        kind: interaction.kind,
        title,
        subtitle: card.subtitle,
        body: card.body,
        platformMessageId: delivery?.platformMessageId,
      };

      if (suffix === 'request') {
        await this.conversationService.persistHumanInteractionRequest({
          ...context,
          actorType: ConversationActivitySenderTypeEnum.AGENT,
          actorId: agentIdentifier,
        });

        return;
      }

      const respondedBy = interaction.response?.respondedBy?.trim();
      const respondedBySubscriberId = interaction.response?.respondedBySubscriberId;
      const isHuman = Boolean(respondedBySubscriberId || respondedBy);

      await this.conversationService.persistHumanInteractionResponse({
        ...context,
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
