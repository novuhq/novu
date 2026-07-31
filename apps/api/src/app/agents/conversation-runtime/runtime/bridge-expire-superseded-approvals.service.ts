import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationChannel,
  ConversationEntity,
} from '@novu/dal';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import {
  findOrphanedApprovedToolApprovalRequests,
  findUnresolvedToolApprovalRequests,
} from '../../shared/tool-approval/unresolved-approvals';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import type { ConversationTurn } from './conversation-turn';

/**
 * Self-hosted bridge only: when the user sends a new message while tool-approval
 * cards are still pending, auto-deny them in the ledger and delete the cards on-channel.
 *
 * Also auto-denies orphaned approved cycles — approved but never resolved with a
 * tool result (the resume turn crashed or never ran). Without a terminal row, such
 * a cycle replays as a dangling `tool_use` and fails every later model turn.
 */
@Injectable()
export class BridgeExpireSupersededApprovalsService {
  constructor(
    private readonly conversationService: AgentConversationService,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async expireOnNewMessage(turn: ConversationTurn): Promise<void> {
    const { config, conversation } = turn;
    const activities = await this.conversationService.getHistory(config.environmentId, conversation._id);
    const pending = findUnresolvedToolApprovalRequests(activities);
    const orphaned = findOrphanedApprovedToolApprovalRequests(activities);

    if (pending.length === 0 && orphaned.length === 0) {
      return;
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);

    for (const request of pending) {
      await this.expireOne(turn, conversation, request, channel, { deleteCard: true });
    }

    // Orphaned cycles already had their card handled by the approve flow — only the
    // terminal ledger row is missing, so no channel cleanup.
    for (const request of orphaned) {
      await this.expireOne(turn, conversation, request, channel, { deleteCard: false });
    }
  }

  private async expireOne(
    turn: ConversationTurn,
    conversation: ConversationEntity,
    request: ConversationActivityEntity,
    channel: ConversationChannel,
    options: { deleteCard: boolean }
  ): Promise<void> {
    const { config } = turn;
    const approvalId = request.toolData?.approvalId;

    if (typeof approvalId !== 'string') {
      return;
    }

    try {
      await this.conversationService.persistToolApprovalDecision({
        conversationId: conversation._id,
        channel,
        agentIdentifier: config.agentIdentifier,
        approvalId,
        approved: false,
        toolName: request.toolData?.toolName,
        actorType: ConversationActivitySenderTypeEnum.SYSTEM,
        actorId: config.agentIdentifier,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
      });
    } catch (err) {
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to persist superseded tool-approval decision`);
      captureAgentWarning(err, {
        component: 'bridge-expire-superseded-approvals',
        operation: 'persist-tool-approval-decision',
        agentIdentifier: config.agentIdentifier,
        extra: { approvalId },
      });

      return;
    }

    const platformMessageId = request.platformMessageId;
    if (!options.deleteCard || !platformMessageId) {
      return;
    }

    try {
      await this.outboundGateway.deleteInConversation(
        turn.agentId,
        config.integrationIdentifier,
        channel.platform,
        channel.platformThreadId,
        platformMessageId,
        channel.workspace?.id,
        {
          conversationId: conversation._id,
          channel,
          agentIdentifier: config.agentIdentifier,
          agentName: config.agentName,
          environmentId: config.environmentId,
          organizationId: config.organizationId,
        }
      );
    } catch (err) {
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to delete superseded tool-approval card`);
      captureAgentWarning(err, {
        component: 'bridge-expire-superseded-approvals',
        operation: 'delete-tool-approval-card',
        agentIdentifier: config.agentIdentifier,
        extra: { approvalId, platformMessageId },
      });
    }
  }
}
