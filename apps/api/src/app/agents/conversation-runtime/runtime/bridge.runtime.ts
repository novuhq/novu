import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import type { CardChild, CardElement } from 'chat';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import type { AgentRuntime } from './agent-runtime.port';
import { type AgentExecutionParams, BridgeExecutorService, NoBridgeUrlError } from './bridge-executor.service';
import { buildAgentPlatformContext, buildEmailPlatformContext } from './build-platform-context.util';
import type { ConversationTurn } from './conversation-turn';
import { applyPlatformThreadIdToThread } from './platform-thread.util';

const BRIDGE_OFFLINE_REPLY_MARKDOWN = `*The agent is currently offline.*

The agent is unavailable right now. Please try again later.`;

const ONBOARDING_NO_BRIDGE_TEXT =
  "I'm live but running on defaults. Connect your agent in the dashboard to customize how I respond.";

function buildNoBridgeReply(dashboardUrl?: string): Record<string, unknown> {
  const children: CardChild[] = [{ type: 'text', content: ONBOARDING_NO_BRIDGE_TEXT }];

  if (dashboardUrl) {
    children.push(
      { type: 'divider' },
      {
        type: 'actions',
        children: [{ type: 'link-button', label: 'Continue setup', url: dashboardUrl, style: 'primary' }],
      }
    );
  }

  const card: CardElement = { type: 'card', children };

  return card as unknown as Record<string, unknown>;
}

@Injectable()
export class BridgeRuntime implements AgentRuntime {
  constructor(
    private readonly bridgeExecutor: BridgeExecutorService,
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationService: AgentConversationService,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** Bridge handles every turn shape the same way: forward it to the customer bridge. */
  async dispatch(turn: ConversationTurn): Promise<void> {
    try {
      await this.bridgeExecutor.execute(this.toExecutionParams(turn));
    } catch (err) {
      if (err instanceof NoBridgeUrlError) {
        await this.replyNoBridgeConfigured(turn);

        return;
      }

      throw err;
    }
  }

  private toExecutionParams(turn: ConversationTurn): AgentExecutionParams {
    return {
      event: turn.event,
      config: turn.config,
      conversation: turn.conversation,
      subscriber: turn.subscriber,
      message: turn.message,
      platformContext: buildAgentPlatformContext({
        platformThreadId: turn.platformThreadId,
        channelId: turn.thread.channelId,
        isDM: turn.thread.isDM,
        message: turn.message,
        email: buildEmailPlatformContext({
          platform: turn.config.platform,
          message: turn.message,
          firstPlatformMessageId: this.conversationService.getPrimaryChannel(turn.conversation).firstPlatformMessageId,
        }),
      }),
      storedAttachments: turn.storedAttachments,
      action: turn.action,
      reaction: turn.reaction,
      onBridgeFailure: async () => {
        applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
        await this.outboundGateway.replyOnThread(
          turn.thread,
          { markdown: BRIDGE_OFFLINE_REPLY_MARKDOWN },
          {
            persist: {
              conversationId: turn.conversation._id,
              channel: this.conversationService.getPrimaryChannel(turn.conversation),
              agentIdentifier: turn.config.agentIdentifier,
              content: BRIDGE_OFFLINE_REPLY_MARKDOWN,
              environmentId: turn.config.environmentId,
              organizationId: turn.config.organizationId,
            },
          }
        );
      },
    };
  }

  private async replyNoBridgeConfigured(turn: ConversationTurn): Promise<void> {
    applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);

    let dashboardUrl: string | undefined;
    const dashboardBase = process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL;
    if (dashboardBase) {
      try {
        const environment = await this.environmentRepository.findOne({ _id: turn.config.environmentId });
        if (environment?.identifier) {
          dashboardUrl = `${dashboardBase}/env/${environment.identifier}/agents/${turn.config.agentIdentifier}/overview`;
        }
      } catch (lookupErr) {
        this.logger.warn(
          lookupErr,
          `[agent:${turn.config.agentIdentifier}] Failed to resolve dashboard URL for no-bridge reply`
        );
        captureAgentWarning(lookupErr, {
          component: 'bridge-runtime',
          operation: 'resolve-dashboard-url',
          agentIdentifier: turn.config.agentIdentifier,
        });
      }
    }

    const reply = buildNoBridgeReply(dashboardUrl);
    await this.outboundGateway.replyOnThread(
      turn.thread,
      { card: reply },
      {
        persist: {
          conversationId: turn.conversation._id,
          channel: this.conversationService.getPrimaryChannel(turn.conversation),
          agentIdentifier: turn.config.agentIdentifier,
          content: ONBOARDING_NO_BRIDGE_TEXT,
          richContent: { card: reply },
          environmentId: turn.config.environmentId,
          organizationId: turn.config.organizationId,
        },
      }
    );
  }
}
