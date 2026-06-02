import { Injectable } from '@nestjs/common';
import { DEMO_QUOTA_EXHAUSTED_REPLY, DemoQuotaExhaustedError, PinoLogger } from '@novu/application-generic';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { AgentRuntime } from '../conversation-runtime/runtime/agent-runtime.port';
import type { ConversationTurn } from '../conversation-runtime/runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../conversation-runtime/runtime/platform-thread.util';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { UNRESOLVED_SUBSCRIBER_ACCESS_REPLY } from '../shared/util/agent-inbound-replies';
import { ManagedAgentService } from './managed-agent.service';
import { HandleManagedAgentSetupInbound } from './setup/handle-managed-agent-setup-inbound.usecase';
import { ManagedAgentSetupInboundCommand } from './setup/managed-agent-setup-inbound.command';
import { parseToolApprovalActionId } from './tool-approval/approval-card.builder';
import { ConfirmToolApprovalCommand } from './tool-approval/confirm-tool-approval.command';
import { ConfirmToolApproval } from './tool-approval/confirm-tool-approval.usecase';

@Injectable()
export class ManagedRuntime implements AgentRuntime {
  constructor(
    private readonly managedAgentService: ManagedAgentService,
    private readonly handleManagedAgentSetupInbound: HandleManagedAgentSetupInbound,
    private readonly confirmToolApproval: ConfirmToolApproval,
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationService: AgentConversationService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async dispatch(turn: ConversationTurn): Promise<void> {
    if (turn.event === AgentEventEnum.ON_ACTION) {
      await this.handleAction(turn);

      return;
    }

    // Managed agents otherwise only act on inbound messages (reactions are bridge-only today).
    if (turn.event !== AgentEventEnum.ON_MESSAGE) {
      return;
    }

    if (!turn.subscriber) {
      await this.replyUnresolvedSubscriberAccess(turn);

      return;
    }

    if (turn.message?.id) {
      const parked = await this.handleManagedAgentSetupInbound.execute(
        ManagedAgentSetupInboundCommand.create({
          userId: turn.config.organizationId,
          environmentId: turn.config.environmentId,
          organizationId: turn.config.organizationId,
          conversationId: turn.conversation._id,
          agentId: turn.agent._id,
          subscriberId: turn.subscriber.subscriberId,
          agentIdentifier: turn.config.agentIdentifier,
          integrationIdentifier: turn.config.integrationIdentifier,
          platformMessageId: turn.message.id,
        })
      );

      if (parked) {
        return;
      }
    }

    try {
      await this.managedAgentService.dispatch(
        {
          config: turn.config,
          conversation: turn.conversation,
          subscriber: turn.subscriber,
          userMessageText: turn.message?.text ?? '',
        },
        turn.agent
      );
    } catch (err) {
      if (err instanceof DemoQuotaExhaustedError) {
        await this.replyDemoQuotaExhausted(turn);

        return;
      }

      throw err;
    }
  }

  /**
   * Card clicks on a managed agent are Novu-internal only: MCP Approve/Deny
   * (mcp-approval:*) is confirmed here; any other id is a no-op (managed agents
   * have no bridge onAction to forward to, and link buttons are handled in ingress).
   */
  private async handleAction(turn: ConversationTurn): Promise<void> {
    const toolApproval = parseToolApprovalActionId(turn.action?.id);

    if (!toolApproval) {
      return;
    }

    await this.confirmToolApproval.execute(
      ConfirmToolApprovalCommand.create({
        userId: turn.config.organizationId,
        environmentId: turn.config.environmentId,
        organizationId: turn.config.organizationId,
        conversationId: turn.conversation._id,
        agentIdentifier: turn.config.agentIdentifier,
        integrationIdentifier: turn.config.integrationIdentifier,
        agentId: turn.agentId,
        subscriberId: turn.subscriber?.subscriberId ?? undefined,
        platform: turn.config.platform,
        parsed: toolApproval,
        sourceMessageId: turn.action?.sourceMessageId,
        platformThreadId: turn.platformThreadId,
        actionValue: turn.action?.value,
      })
    );
  }

  private async replyDemoQuotaExhausted(turn: ConversationTurn): Promise<void> {
    applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
    await this.outboundGateway.replyOnThread(
      turn.thread,
      { markdown: DEMO_QUOTA_EXHAUSTED_REPLY },
      {
        persist: {
          conversationId: turn.conversation._id,
          channel: this.conversationService.getPrimaryChannel(turn.conversation),
          agentIdentifier: turn.config.agentIdentifier,
          content: DEMO_QUOTA_EXHAUSTED_REPLY,
          environmentId: turn.config.environmentId,
          organizationId: turn.config.organizationId,
        },
      }
    );
  }

  private async replyUnresolvedSubscriberAccess(turn: ConversationTurn): Promise<void> {
    applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
    await this.outboundGateway.replyOnThread(
      turn.thread,
      { markdown: UNRESOLVED_SUBSCRIBER_ACCESS_REPLY },
      {
        persist: {
          conversationId: turn.conversation._id,
          channel: this.conversationService.getPrimaryChannel(turn.conversation),
          agentIdentifier: turn.config.agentIdentifier,
          content: UNRESOLVED_SUBSCRIBER_ACCESS_REPLY,
          environmentId: turn.config.environmentId,
          organizationId: turn.config.organizationId,
        },
      }
    );
  }
}
