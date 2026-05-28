import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { PendingToolApproval } from '@novu/application-generic';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  ConversationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { AgentPlatformEnum } from '../../dtos/agent-platform.enum';
import { ManagedAgentService } from '../../services/managed-agent.service';
import { ManagedAgentProviderFactory } from '../../services/managed-agent-provider-factory';
import { captureAgentException, captureAgentWarning } from '../../utils/capture-agent-sentry';
import { HandleAgentReplyCommand } from '../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand } from '../handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../handle-plan-progress/handle-plan-progress.usecase';
import { buildToolApprovalCard, extractPendingToolApprovals } from './approval-card.builder';
import { HandlePendingToolApprovalsCommand } from './handle-pending-tool-approvals.command';
import { resolveTrustForPendingTool } from './tool-trust.helper';

@Injectable()
export class HandlePendingToolApprovals {
  constructor(
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly conversationRepository: ConversationRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    @Inject(forwardRef(() => ManagedAgentService))
    private readonly managedAgentService: ManagedAgentService,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: HandlePendingToolApprovalsCommand): Promise<void> {
    const runtimeProvider = await this.providerFactory.tryGetByAgentIdentifier(
      command.agentIdentifier,
      command.environmentId
    );

    if (!runtimeProvider) {
      return;
    }

    // Which tools need approval?
    // 1. extractPendingToolApprovals — read response.actionsRequired from this webhook (fast, no API call).
    // 2. getAllPendingToolApprovals — fallback when the webhook says requires-action but omits tool details
    //    (e.g. user already approved some tools in the same session and others are still waiting).
    let pendingTools = extractPendingToolApprovals(command.response);

    if (pendingTools.length === 0) {
      try {
        pendingTools = await runtimeProvider.getAllPendingToolApprovals(command.sessionId);
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err), sessionId: command.sessionId },
          'getAllPendingToolApprovals failed; cannot render Approve/Deny card'
        );
        captureAgentWarning(err, {
          component: 'handle-pending-tool-approvals',
          operation: 'get-all-pending-tool-approvals',
          sessionId: command.sessionId,
        });

        return;
      }
    }

    if (pendingTools.length === 0) {
      this.logger.warn(
        { sessionId: command.sessionId, conversationId: command.conversationId },
        'Session is parked on requires-action but no pending tool approvals were located'
      );

      return;
    }

    // Split by mcp_connection.toolTrust: auto-approve matches, card for the rest.
    const { trustedTools, needsPromptTools } = await this.partitionByTrust(command, pendingTools);

    // Trusted: tell Anthropic yes without posting anything to the chat thread.
    if (trustedTools.length > 0) {
      try {
        await this.managedAgentService.resumeWithToolResults({
          conversationId: command.conversationId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          subscriberId: command.subscriberId,
          platform: command.platform as AgentPlatformEnum | undefined,
          toolUseIds: trustedTools.map((tool) => tool.toolUseId),
          approved: true,
          turnId: command.turnId,
        });
      } catch (err) {
        this.logger.warn(
          {
            err: err instanceof Error ? err.message : String(err),
            sessionId: command.sessionId,
            toolUseIds: trustedTools.map((t) => t.toolUseId),
          },
          'Auto-confirm for trusted MCP tools failed; falling back to approval card'
        );
        captureAgentWarning(err, {
          component: 'handle-pending-tool-approvals',
          operation: 'auto-confirm-trusted-tools',
          sessionId: command.sessionId,
        });

        await this.deliverCard(command, pendingTools);

        return;
      }
    }

    if (needsPromptTools.length === 0) {
      return;
    }

    // Untrusted (or mixed batch remainder): post Approve/Deny card to the thread.
    await this.deliverCard(command, needsPromptTools);
  }

  private async partitionByTrust(
    command: HandlePendingToolApprovalsCommand,
    pendingTools: PendingToolApproval[]
  ): Promise<{ trustedTools: PendingToolApproval[]; needsPromptTools: PendingToolApproval[] }> {
    const conversation = await this.conversationRepository.findOne(
      {
        _id: command.conversationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_agentId']
    );

    if (!conversation) {
      return { trustedTools: [], needsPromptTools: pendingTools };
    }

    const subscriberMongoId = command.subscriberId
      ? (await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId))?._id
      : undefined;

    const trustedTools: PendingToolApproval[] = [];
    const needsPromptTools: PendingToolApproval[] = [];

    for (const tool of pendingTools) {
      const resolution = await resolveTrustForPendingTool({
        findOAuthEnablementsForAgent: (params) => this.agentMcpServerRepository.findOAuthEnablementsForAgent(params),
        findSubscriberConnection: (params) => this.mcpConnectionRepository.findSubscriberConnection(params),
        params: {
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentId: conversation._agentId,
          subscriberMongoId,
          mcpServerName: tool.mcpServerName,
          toolName: tool.toolName,
        },
      });

      if (resolution?.trusted) {
        trustedTools.push(tool);
        continue;
      }

      needsPromptTools.push(tool);
    }

    return { trustedTools, needsPromptTools };
  }

  private async deliverCard(
    command: HandlePendingToolApprovalsCommand,
    pendingTools: PendingToolApproval[]
  ): Promise<void> {
    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          conversationId: command.conversationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          reply: { card: buildToolApprovalCard(pendingTools, command.turnId) },
        })
      );
    } catch (err) {
      this.logger.error(err, `Failed to deliver tool-approval card for session ${command.sessionId}`);
      captureAgentException(err, {
        component: 'handle-pending-tool-approvals',
        operation: 'deliver-tool-approval-card',
        sessionId: command.sessionId,
      });

      return;
    }

    await this.handlePlanProgress.execute(
      HandlePlanProgressCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        conversationId: command.conversationId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
        toolProgress: { turnId: command.turnId, action: 'awaiting-approval' },
      })
    );
  }
}
