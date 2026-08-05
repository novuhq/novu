import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { AgentEventEnum } from '../../shared/enums/agent-event.enum';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import type { AgentRuntime } from './agent-runtime.port';
import { type AgentExecutionParams, BridgeExecutorService, NoBridgeUrlError } from './bridge-executor.service';
import { BridgeExpireSupersededApprovalsService } from './bridge-expire-superseded-approvals.service';
import { buildAgentDashboardOverviewUrl, buildNoBridgeReply } from './bridge-no-bridge-reply';
import { buildAgentPlatformContext, buildEmailPlatformContext } from './build-platform-context.util';
import type { ConversationTurn } from './conversation-turn';
import { applyPlatformThreadIdToThread } from './platform-thread.util';

const BRIDGE_OFFLINE_REPLY_MARKDOWN = `*The agent is currently offline.*

The agent is unavailable right now. Please try again later.`;

@Injectable()
export class BridgeRuntime implements AgentRuntime {
  constructor(
    private readonly bridgeExecutor: BridgeExecutorService,
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationService: AgentConversationService,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly expireSupersededApprovals: BridgeExpireSupersededApprovalsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** Bridge handles every turn shape the same way: forward it to the customer bridge. */
  async dispatch(turn: ConversationTurn): Promise<void> {
    if (turn.event === AgentEventEnum.ON_MESSAGE) {
      try {
        await this.expireSupersededApprovals.expireOnNewMessage(turn);
      } catch (err) {
        this.logger.warn(err, `[agent:${turn.config.agentIdentifier}] Failed to expire superseded tool approvals`);
        captureAgentWarning(err, {
          component: 'bridge-runtime',
          operation: 'expire-on-new-message',
          agentIdentifier: turn.config.agentIdentifier,
        });
      }
    }

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
      context: turn.context ?? null,
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

    const creationSource = turn.config.creationSource;
    let dashboardUrl: string | undefined;
    const dashboardBase = process.env.DASHBOARD_URL || process.env.FRONT_BASE_URL;

    // CLI onboarding users finish setup in the terminal — skip the dashboard CTA entirely.
    if (creationSource !== 'cli' && dashboardBase) {
      try {
        const environment = await this.environmentRepository.findOne(
          {
            _id: turn.config.environmentId,
            _organizationId: turn.config.organizationId,
          },
          ['_id', 'name']
        );
        if (environment?.name) {
          dashboardUrl = buildAgentDashboardOverviewUrl({
            dashboardBase,
            environmentName: environment.name,
            environmentId: environment._id,
            agentIdentifier: turn.config.agentIdentifier,
          });
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

    const reply = buildNoBridgeReply({ creationSource, dashboardUrl });
    await this.outboundGateway.replyOnThread(
      turn.thread,
      { card: reply.card },
      {
        persist: {
          conversationId: turn.conversation._id,
          channel: this.conversationService.getPrimaryChannel(turn.conversation),
          agentIdentifier: turn.config.agentIdentifier,
          content: reply.content,
          richContent: { card: reply.card },
          environmentId: turn.config.environmentId,
          organizationId: turn.config.organizationId,
        },
      }
    );
  }
}
