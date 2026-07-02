import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  ConversationActivityEntity,
  ConversationActivitySenderTypeEnum,
  ConversationActivityTypeEnum,
  ConversationChannel,
  ConversationEntity,
} from '@novu/dal';
import { Card, CardText } from '@novu/framework';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import type { ConversationTurn } from './conversation-turn';

function findUnresolvedToolApprovalRequests(activities: ConversationActivityEntity[]): ConversationActivityEntity[] {
  const chronological = [...activities].reverse();
  const decidedApprovalIds = new Set<string>();
  const resultToolCallIds = new Set<string>();

  for (const activity of chronological) {
    if (activity.type === ConversationActivityTypeEnum.TOOL_APPROVAL_DECISION) {
      const approvalId = activity.toolData?.approvalId;
      if (typeof approvalId === 'string') {
        decidedApprovalIds.add(approvalId);
      }
    } else if (activity.type === ConversationActivityTypeEnum.TOOL_RESULT) {
      const toolCallId = activity.toolData?.toolCallId;
      if (typeof toolCallId === 'string') {
        resultToolCallIds.add(toolCallId);
      }
    }
  }

  const unresolved: ConversationActivityEntity[] = [];

  for (const activity of chronological) {
    if (activity.type !== ConversationActivityTypeEnum.TOOL_APPROVAL_REQUEST) {
      continue;
    }

    const approvalId = activity.toolData?.approvalId;
    const toolCallId = activity.toolData?.toolCallId;
    if (typeof approvalId !== 'string' || typeof toolCallId !== 'string') {
      continue;
    }

    if (decidedApprovalIds.has(approvalId) || resultToolCallIds.has(toolCallId)) {
      continue;
    }

    unresolved.push(activity);
  }

  return unresolved;
}

function buildDeniedApprovalCard(toolName: string): Record<string, unknown> {
  const card = Card({
    title: 'Denied',
    subtitle: toolName,
    children: [CardText(`Skipped ${toolName}.`)],
  });

  return card as unknown as Record<string, unknown>;
}

/**
 * Self-hosted bridge only: when the user sends a new message while tool-approval
 * cards are still pending, auto-deny them in the ledger and resolve the cards in Slack.
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

    if (pending.length === 0) {
      return;
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);

    for (const request of pending) {
      await this.expireOne(turn, conversation, request, channel);
    }
  }

  private async expireOne(
    turn: ConversationTurn,
    conversation: ConversationEntity,
    request: ConversationActivityEntity,
    channel: ConversationChannel
  ): Promise<void> {
    const { config } = turn;
    const approvalId = request.toolData?.approvalId;
    const toolName = request.toolData?.toolName ?? 'tool call';

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
    if (!platformMessageId) {
      return;
    }

    try {
      await this.outboundGateway.edit(
        {
          agentId: turn.agentId,
          integrationIdentifier: config.integrationIdentifier,
          platform: channel.platform,
          platformThreadId: channel.platformThreadId,
        },
        platformMessageId,
        { card: buildDeniedApprovalCard(toolName) },
        {
          conversationId: conversation._id,
          channel,
          agentIdentifier: config.agentIdentifier,
          environmentId: config.environmentId,
          organizationId: config.organizationId,
        }
      );
    } catch (err) {
      this.logger.warn(err, `[agent:${config.agentIdentifier}] Failed to edit superseded tool-approval card`);
      captureAgentWarning(err, {
        component: 'bridge-expire-superseded-approvals',
        operation: 'edit-tool-approval-card',
        agentIdentifier: config.agentIdentifier,
        extra: { approvalId, platformMessageId },
      });
    }
  }
}
