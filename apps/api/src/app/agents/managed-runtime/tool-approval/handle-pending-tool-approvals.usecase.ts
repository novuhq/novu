import { forwardRef, Inject, Injectable } from '@nestjs/common';
import type { IAgentRuntimeProvider, PendingToolApproval } from '@novu/application-generic';
import { PinoLogger } from '@novu/application-generic';
import { ConversationParticipant, ConversationRepository } from '@novu/dal';
import { NOVU_INTERNAL_TOOLS } from '@novu/shared';
import { AgentSubscriberResolver } from '../../conversation-runtime/conversation/agent-subscriber-resolver.service';
import { HandleAgentReplyCommand } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand } from '../../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { captureAgentException, captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { ManagedAgentService } from '../managed-agent.service';
import { ManagedAgentProviderFactory } from '../managed-agent-provider-factory.service';
import { HandleNovuToolsCommand, NovuToolsActionEnum } from '../tool-connect/handle-novu-tools.command';
import { HandleNovuTools } from '../tool-connect/handle-novu-tools.usecase';
import { extractPendingToolApprovals, getToolApprovalCard } from './approval-card.builder';
import { HandlePendingToolApprovalsCommand } from './handle-pending-tool-approvals.command';
import { recoverEmailFromParticipants, recoverSubscriberParticipantId } from './handle-pending-tool-approvals.helpers';
import { ToolTrustService } from './tool-trust.service';

@Injectable()
export class HandlePendingToolApprovals {
  constructor(
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly conversationRepository: ConversationRepository,
    private readonly toolTrustService: ToolTrustService,
    @Inject(forwardRef(() => ManagedAgentService))
    private readonly managedAgentService: ManagedAgentService,
    private readonly subscriberResolver: AgentSubscriberResolver,
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

    const { autoApprovedTools, pendingApprovalTools } = await this.toolTrustService.partitionByTrust({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      subscriberExternalId: command.subscriberId,
      tools: externalTools,
    });

    if (autoApprovedTools.length > 0) {
      try {
        await this.autoConfirmTrustedTools(command, autoApprovedTools);
      } catch {
        await this.deliverAutoConfirmFailure(command);

        return;
      }

      // Resume succeeded — the follow-up requires-action webhook will post the next card.
      return;
    }

    const nextTool = pendingApprovalTools[0];

    if (!nextTool) {
      return;
    }

    // No auto-approved tools in this batch — prompt for the first one only (sequential approval).
    await this.deliverApprovalCard(command, nextTool);
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
          'Auto-confirm for trusted tool failed'
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
          event: { kind: 'phase', phase: 'failed' },
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
      ['_agentId', 'participants']
    );

    if (!conversation?._agentId) return;

    const subscriberId =
      command.subscriberId || (await this.provisionDemoSubscriber(command, conversation.participants ?? []));

    if (!subscriberId) {
      await this.resolveInternalToolsWithoutSubscriber(command, tools);

      return;
    }

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
          subscriberId,
          sessionId: command.sessionId,
          platform: command.platform,
          platformThreadId: command.platformThreadId,
        })
      );
    }
  }

  private async provisionDemoSubscriber(
    command: HandlePendingToolApprovalsCommand,
    participants: ConversationParticipant[]
  ): Promise<string | undefined> {
    if (command.platform !== AgentPlatformEnum.EMAIL) {
      return undefined;
    }

    const upgradedSubscriberId = recoverSubscriberParticipantId(participants);

    if (upgradedSubscriberId) {
      return upgradedSubscriberId;
    }

    const email = recoverEmailFromParticipants(participants, command.platform);

    if (!email) {
      return undefined;
    }

    try {
      const subscriberId = await this.subscriberResolver.provisionEmailSubscriber({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        integrationIdentifier: command.integrationIdentifier,
        agentIdentifier: command.agentIdentifier,
        email,
      });

      return subscriberId ?? undefined;
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), sessionId: command.sessionId },
        'Lazy email subscriber provisioning failed; falling back to degraded tool result'
      );
      captureAgentWarning(err, {
        component: 'handle-pending-tool-approvals',
        operation: 'provision-demo-subscriber',
        sessionId: command.sessionId,
      });

      return undefined;
    }
  }

  private async resolveInternalToolsWithoutSubscriber(
    command: HandlePendingToolApprovalsCommand,
    tools: PendingToolApproval[]
  ): Promise<void> {
    const content = JSON.stringify({
      available: [],
      instruction:
        'Connecting integrations is not available in this demo. Tell the user they need to claim this agent before they can connect MCP integrations, then continue helping with anything else.',
    });

    let lastError: unknown;

    for (const tool of tools) {
      try {
        await this.managedAgentService.sendToolResult({
          conversationId: command.conversationId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          toolUseId: tool.toolUseId,
          content,
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
          'Failed to resolve internal tool without a subscriber'
        );
        captureAgentWarning(err, {
          component: 'handle-pending-tool-approvals',
          operation: 'resolve-internal-tools-without-subscriber',
          sessionId: command.sessionId,
        });
        lastError = err;
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  private async deliverApprovalCard(
    command: HandlePendingToolApprovalsCommand,
    tool: PendingToolApproval
  ): Promise<void> {
    const delivery = getToolApprovalCard({
      platform: command.platform,
      tool,
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
        event: { kind: 'phase', phase: 'awaiting-approval' },
      })
    );
  }
}
