import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ConversationActivitySenderTypeEnum,
  type ConversationChannel,
  HumanInteractionEntity,
  IntegrationRepository,
  primaryHumanInteractionDelivery,
} from '@novu/dal';
import {
  HUMAN_TRUST_SERVER_OPTION_ID,
  HUMAN_TRUST_TOOL_OPTION_ID,
  HumanInteractionStatusEnum,
  parseToolApprovalRequestId,
} from '@novu/shared';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { ConfirmToolApprovalCommand } from '../managed-runtime/tool-approval/confirm-tool-approval.command';
import { ConfirmToolApproval } from '../managed-runtime/tool-approval/confirm-tool-approval.usecase';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { captureAgentException, captureAgentWarning } from '../shared/errors/capture-agent-sentry';
import type { ToolTrustTarget } from '../shared/tool-approval/action-id';
import { editDeliveredHumanCards } from './edit-delivered-card';
import { buildResolvedContent } from './human-card.builder';

@Injectable()
export class ResumeToolApprovalFromHitl {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly agentRepository: AgentRepository,
    private readonly confirmToolApproval: ConfirmToolApproval,
    private readonly outboundGateway: OutboundGateway,
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(interaction: HumanInteractionEntity): Promise<void> {
    const approvalId = parseToolApprovalRequestId(interaction.requestId);
    if (!approvalId || !interaction._conversationId) {
      return;
    }

    const conversation = await this.conversationService.getConversation(
      interaction._conversationId,
      interaction._environmentId,
      interaction._organizationId
    );
    if (!conversation) {
      this.logger.warn(
        { interactionIdentifier: interaction.identifier, conversationId: interaction._conversationId },
        'Skipping tool-approval HITL resume — conversation not found'
      );

      return;
    }

    const agent = await this.agentRepository.findOne(
      {
        _id: interaction._agentId,
        _environmentId: interaction._environmentId,
        _organizationId: interaction._organizationId,
      },
      ['identifier', 'runtime']
    );
    if (!agent?.identifier) {
      this.logger.warn(
        { interactionIdentifier: interaction.identifier, agentId: interaction._agentId },
        'Skipping tool-approval HITL resume — agent not found'
      );

      return;
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);
    const request = await this.findRequestActivity(interaction, approvalId);
    const toolName = request?.toolData?.toolName;
    const mcpServerName = request?.toolData?.mcpServerName;
    const approved = interaction.status === HumanInteractionStatusEnum.APPROVED;

    try {
      await this.conversationService.persistToolApprovalDecision({
        conversationId: conversation._id,
        channel,
        agentIdentifier: agent.identifier,
        approvalId,
        approved,
        toolName,
        actorType: interaction.response?.respondedBySubscriberId
          ? ConversationActivitySenderTypeEnum.SUBSCRIBER
          : ConversationActivitySenderTypeEnum.SYSTEM,
        actorId: interaction.response?.respondedBySubscriberId ?? agent.identifier,
        environmentId: interaction._environmentId,
        organizationId: interaction._organizationId,
      });
    } catch (err) {
      this.logger.warn(
        { err, interactionIdentifier: interaction.identifier, approvalId },
        'Failed to persist tool-approval decision from HITL settlement'
      );
      captureAgentWarning(err, {
        component: 'resume-tool-approval-from-hitl',
        operation: 'persist-tool-approval-decision',
        agentId: interaction._agentId,
        agentIdentifier: agent.identifier,
      });
    }

    if (agent.runtime !== 'managed') {
      // Self-hosted: the tool resume is driven by the bridge ON_ACTION dispatch;
      // here we only disable the delivered card in place so its buttons can no
      // longer be clicked (matters most on expiry, which has no bridge dispatch).
      await editDeliveredHumanCards(this.outboundGateway, this.logger, interaction, buildResolvedContent(interaction));

      return;
    }

    const delivery = primaryHumanInteractionDelivery(interaction);
    const platform = toAgentPlatform(delivery?.platform ?? channel.platform);
    if (!platform) {
      this.logger.warn(
        { interactionIdentifier: interaction.identifier, platform: delivery?.platform ?? channel.platform },
        'Skipping managed tool-approval confirm — unknown platform'
      );

      return;
    }

    // Managed web-chat approvals use protocol events, so the HITL row carries no
    // platform delivery — resolve the channel's integration identifier instead so
    // the resumed run's outbound reply can route back to this conversation.
    const integrationIdentifier =
      delivery?.integrationIdentifier ?? (await this.resolveChannelIntegrationIdentifier(channel, interaction));
    if (!integrationIdentifier) {
      this.logger.warn(
        { interactionIdentifier: interaction.identifier, integrationId: channel._integrationId },
        'Skipping managed tool-approval confirm — could not resolve integration identifier'
      );

      return;
    }

    const trust = this.trustFromOptionId(interaction.response?.optionId, toolName, mcpServerName);

    try {
      await this.confirmToolApproval.execute(
        ConfirmToolApprovalCommand.create({
          userId: interaction._organizationId,
          environmentId: interaction._environmentId,
          organizationId: interaction._organizationId,
          conversationId: conversation._id,
          agentIdentifier: agent.identifier,
          integrationIdentifier,
          agentId: interaction._agentId,
          subscriberId: interaction.response?.respondedBySubscriberId ?? delivery?.subscriberId,
          platform,
          parsed: {
            toolUseId: approvalId,
            approved,
            ...(trust ? { trust } : {}),
          },
          platformThreadId: delivery?.platformThreadId ?? channel.platformThreadId,
          sourceMessageId: delivery?.platformMessageId,
        })
      );
    } catch (err) {
      // A failed confirm leaves the managed session's gated tool parked with no
      // retry — capture at error level so the silent hang is diagnosable.
      this.logger.warn(
        { err, interactionIdentifier: interaction.identifier, approvalId },
        'Failed to confirm managed tool approval from HITL settlement'
      );
      captureAgentException(err, {
        component: 'resume-tool-approval-from-hitl',
        operation: 'confirm-managed-tool-approval',
        agentId: interaction._agentId,
        agentIdentifier: agent.identifier,
        platform,
      });
    }
  }

  private async resolveChannelIntegrationIdentifier(
    channel: ConversationChannel,
    interaction: HumanInteractionEntity
  ): Promise<string | undefined> {
    if (!channel._integrationId) {
      return undefined;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: channel._integrationId,
        _environmentId: interaction._environmentId,
        _organizationId: interaction._organizationId,
      },
      'identifier'
    );

    return integration?.identifier;
  }

  private trustFromOptionId(
    optionId: string | undefined,
    toolName: string | undefined,
    mcpServerName: string | undefined
  ): ToolTrustTarget | undefined {
    if (optionId === HUMAN_TRUST_TOOL_OPTION_ID && toolName) {
      return { scope: 'tool', toolName, ...(mcpServerName ? { mcpServerName } : {}) };
    }

    if (optionId === HUMAN_TRUST_SERVER_OPTION_ID && mcpServerName) {
      return { scope: 'server', mcpServerName };
    }

    return undefined;
  }

  private async findRequestActivity(interaction: HumanInteractionEntity, approvalId: string) {
    if (!interaction._conversationId) {
      return undefined;
    }

    const page = await this.conversationService.listForView({
      view: 'approval_activities',
      environmentId: interaction._environmentId,
      organizationId: interaction._organizationId,
      conversationId: interaction._conversationId,
    });

    return page.data.find((activity) => activity.toolData?.approvalId === approvalId);
  }
}

function toAgentPlatform(platform: string): AgentPlatformEnum | null {
  return (Object.values(AgentPlatformEnum) as string[]).includes(platform) ? (platform as AgentPlatformEnum) : null;
}
