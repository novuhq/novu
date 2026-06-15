import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { IAgentRuntimeProvider, PendingToolApproval } from '@novu/application-generic';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  ConversationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { NOVU_INTERNAL_TOOLS } from '@novu/shared';
import { HandleAgentReplyCommand } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand } from '../../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { captureAgentException, captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { ManagedAgentService } from '../managed-agent.service';
import { ManagedAgentProviderFactory } from '../managed-agent-provider-factory.service';
import { HandleNovuToolsCommand, NovuToolsActionEnum } from '../tool-connect/handle-novu-tools.command';
import { HandleNovuTools } from '../tool-connect/handle-novu-tools.usecase';
import { extractPendingToolApprovals, getToolApprovalCard } from './approval-card.builder';
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
    private readonly handleNovuTools: HandleNovuTools,
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

    const pendingTools = await this.fetchPendingTools(command, runtimeProvider);

    if (pendingTools.length === 0) {
      this.logger.warn(
        { sessionId: command.sessionId, conversationId: command.conversationId },
        'Session is parked on requires-action but no pending tool approvals were located'
      );

      return;
    }

    const { internalTools, externalTools } = this.partitionInternalTools(pendingTools);

    await this.handleInternalTools(command, internalTools);

    if (externalTools.length === 0) return;

    const { trustedTools, needsPromptTools } = await this.partitionByTrust(command, externalTools);

    if (trustedTools.length > 0) {
      try {
        await this.autoConfirmTrustedTools(command, trustedTools);
      } catch {
        await this.deliverAutoConfirmFailure(command);

        return;
      }

      // Resume succeeded — the follow-up requires-action webhook will post the next card.
      return;
    }

    const nextTool = needsPromptTools[0];

    if (!nextTool) {
      return;
    }

    // No trusted tools in this batch — prompt for the first one only (sequential approval).
    await this.deliverApprovalCard(command, nextTool, needsPromptTools.length);
  }

  private async fetchPendingTools(
    command: HandlePendingToolApprovalsCommand,
    runtimeProvider: IAgentRuntimeProvider
  ): Promise<PendingToolApproval[]> {
    const fromResponse = extractPendingToolApprovals(command.response);

    if (fromResponse.length > 0) {
      return fromResponse;
    }

    try {
      return await runtimeProvider.getAllPendingToolApprovals(command.sessionId);
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

      return [];
    }
  }

  private async autoConfirmTrustedTools(
    command: HandlePendingToolApprovalsCommand,
    trustedTools: PendingToolApproval[]
  ): Promise<void> {
    for (const tool of trustedTools) {
      try {
        await this.managedAgentService.sendToolResult({
          conversationId: command.conversationId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          subscriberId: command.subscriberId,
          toolUseId: tool.toolUseId,
          approved: true,
          platform: command.platform,
          platformThreadId: command.platformThreadId,
        });
      } catch (err) {
        this.logger.warn(
          {
            err: err instanceof Error ? err.message : String(err),
            sessionId: command.sessionId,
            toolUseId: tool.toolUseId,
          },
          'Auto-confirm for trusted MCP tool failed'
        );
        captureAgentWarning(err, {
          component: 'handle-pending-tool-approvals',
          operation: 'auto-confirm-trusted-tools',
          sessionId: command.sessionId,
        });

        throw err;
      }
    }
  }

  private async deliverAutoConfirmFailure(command: HandlePendingToolApprovalsCommand): Promise<void> {
    const message = 'The agent is temporarily unavailable. Please try again later.';

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          conversationId: command.conversationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          reply: { markdown: message },
        })
      );
      await this.handlePlanProgress.execute(
        HandlePlanProgressCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          conversationId: command.conversationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          toolProgress: { action: 'fail' },
        })
      );
    } catch (deliveryErr) {
      this.logger.error(deliveryErr, `Failed to deliver auto-confirm error for session ${command.sessionId}`);
      captureAgentException(deliveryErr, {
        component: 'handle-pending-tool-approvals',
        operation: 'deliver-auto-confirm-failure',
        sessionId: command.sessionId,
      });
    }
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

  private partitionInternalTools(tools: PendingToolApproval[]): {
    internalTools: PendingToolApproval[];
    externalTools: PendingToolApproval[];
  } {
    const internalTools: PendingToolApproval[] = [];
    const externalTools: PendingToolApproval[] = [];

    for (const tool of tools) {
      if (NOVU_INTERNAL_TOOLS.includes(tool.toolName)) {
        internalTools.push(tool);
      } else {
        externalTools.push(tool);
      }
    }

    return { internalTools, externalTools };
  }

  private async handleInternalTools(
    command: HandlePendingToolApprovalsCommand,
    tools: PendingToolApproval[]
  ): Promise<void> {
    if (tools.length === 0) return;

    const conversation = await this.conversationRepository.findOne(
      {
        _id: command.conversationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_agentId']
    );

    if (!conversation?._agentId) return;

    for (const tool of tools) {
      await this.handleNovuTools.execute(
        HandleNovuToolsCommand.create({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          toolUseId: tool.toolUseId,
          action: (tool.input?.action as NovuToolsActionEnum) ?? NovuToolsActionEnum.ListAvailable,
          mcpId: tool.input?.service_id as string | undefined,
          conversationId: command.conversationId,
          agentId: conversation._agentId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          subscriberId: command.subscriberId ?? '',
          sessionId: command.sessionId,
          platform: command.platform,
          platformThreadId: command.platformThreadId,
        })
      );
    }
  }

  private async deliverApprovalCard(
    command: HandlePendingToolApprovalsCommand,
    tool: PendingToolApproval,
    pendingQueueTotal?: number
  ): Promise<void> {
    const delivery = getToolApprovalCard({
      platform: command.platform,
      tool,
      pendingQueueTotal,
    });

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: command.userId,
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          conversationId: command.conversationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          reply: delivery.content,
          slackNative: delivery.slackNative,
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
        toolProgress: { action: 'awaiting-approval' },
      })
    );
  }
}
