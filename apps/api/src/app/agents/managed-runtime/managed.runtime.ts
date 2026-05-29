import { Injectable } from '@nestjs/common';
import { DEMO_QUOTA_EXHAUSTED_REPLY, DemoQuotaExhaustedError, PinoLogger } from '@novu/application-generic';
import type { AgentAction } from '@novu/framework';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { AgentRuntime } from '../conversation-runtime/runtime/agent-runtime.port';
import type { BridgeReaction } from '../conversation-runtime/runtime/bridge-executor.service';
import type { ConversationTurn } from '../conversation-runtime/runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../conversation-runtime/runtime/platform-thread.util';
import { ManagedAgentService } from './managed-agent.service';
import { HandleManagedAgentSetupInbound } from './setup/handle-managed-agent-setup-inbound.usecase';
import { ManagedAgentSetupInboundCommand } from './setup/managed-agent-setup-inbound.command';

@Injectable()
export class ManagedRuntime implements AgentRuntime {
  constructor(
    private readonly managedAgentService: ManagedAgentService,
    private readonly handleManagedAgentSetupInbound: HandleManagedAgentSetupInbound,
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationService: AgentConversationService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async dispatchTurn(turn: ConversationTurn): Promise<void> {
    if (turn.subscriber && turn.message?.id) {
      const parked = await this.handleManagedAgentSetupInbound.execute(
        ManagedAgentSetupInboundCommand.create({
          userId: 'system',
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

  async handleAction(_turn: ConversationTurn, _action: AgentAction): Promise<void> {
    // Managed agents do not forward card actions to a bridge; ingress handles tool-approval and link buttons.
  }

  async handleReaction(_turn: ConversationTurn, _reaction: BridgeReaction): Promise<void> {
    // Reactions are bridge-only today.
  }

  private async replyDemoQuotaExhausted(turn: ConversationTurn): Promise<void> {
    applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
    const sent = await this.outboundGateway.replyOnThread(turn.thread, { markdown: DEMO_QUOTA_EXHAUSTED_REPLY });
    const channel = this.conversationService.getPrimaryChannel(turn.conversation);
    await this.conversationService.persistAgentMessage({
      conversationId: turn.conversation._id,
      channel,
      platformMessageId: sent?.messageId ?? '',
      agentIdentifier: turn.config.agentIdentifier,
      content: DEMO_QUOTA_EXHAUSTED_REPLY,
      environmentId: turn.config.environmentId,
      organizationId: turn.config.organizationId,
    });
  }
}
