import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  ConversationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { OutboundGateway } from '../../conversation-runtime/egress/outbound.gateway';
import { HandlePlanProgressCommand } from '../../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { ManagedAgentService } from '../managed-agent.service';
import { ManagedAgentProviderFactory } from '../managed-agent-provider-factory.service';
import { type ParsedToolApprovalAction } from './approval-card.builder';
import { ConfirmToolApprovalCommand } from './confirm-tool-approval.command';
import { mergeToolTrustPatch, resolveTrustForPendingTool } from './tool-trust.helper';

@Injectable()
export class ConfirmToolApproval {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly managedAgentService: ManagedAgentService,
    private readonly outboundGateway: OutboundGateway,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ConfirmToolApprovalCommand): Promise<void> {
    const { parsed } = command;

    await this.persistTrustIfNeeded(command, parsed);

    const toolUseIds = await this.resolveConfirmationToolUseIds(command, parsed);

    await this.managedAgentService.resumeWithToolResults({
      conversationId: command.conversationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      subscriberId: command.subscriberId,
      platform: command.platform,
      toolUseIds,
      approved: parsed.approved,
    });

    this.deleteApprovalCard(command);
    this.updatePlanProgress(command, parsed);
  }

  private async persistTrustIfNeeded(
    command: ConfirmToolApprovalCommand,
    parsed: ParsedToolApprovalAction
  ): Promise<void> {
    if (!parsed.approved || !parsed.persistScope || !command.subscriberId) {
      return;
    }

    const toolName = parsed.toolName;
    const mcpServerName = parsed.mcpServerName;

    if (!toolName || !mcpServerName) {
      return;
    }

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      return;
    }

    const resolution = await resolveTrustForPendingTool({
      findOAuthEnablementsForAgent: (params) => this.agentMcpServerRepository.findOAuthEnablementsForAgent(params),
      findSubscriberConnection: (params) => this.mcpConnectionRepository.findSubscriberConnection(params),
      params: {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: command.agentId,
        subscriberMongoId: subscriber._id,
        mcpServerName,
        toolName,
      },
    });

    if (!resolution) {
      return;
    }

    await this.mcpConnectionRepository.mergeToolTrust({
      connectionId: resolution.connection._id,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      patch: mergeToolTrustPatch({
        scope: parsed.persistScope,
        toolName,
      }),
    });
  }

  private async resolveConfirmationToolUseIds(
    command: ConfirmToolApprovalCommand,
    parsed: ParsedToolApprovalAction
  ): Promise<string[]> {
    if (parsed.persistScope !== 'server' || !parsed.mcpServerName) {
      return parsed.toolUseIds;
    }

    const sessionId = await this.getExternalSessionId(command);

    if (!sessionId) {
      return parsed.toolUseIds;
    }

    const runtimeProvider = await this.providerFactory.tryGetByAgentIdentifier(
      command.agentIdentifier,
      command.environmentId
    );

    if (!runtimeProvider) {
      return parsed.toolUseIds;
    }

    try {
      const pendingTools = await runtimeProvider.getAllPendingToolApprovals(sessionId);
      const mcpToolUseIds = pendingTools
        .filter((tool) => tool.mcpServerName === parsed.mcpServerName)
        .map((tool) => tool.toolUseId);

      if (mcpToolUseIds.length > 0) {
        return mcpToolUseIds;
      }
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), conversationId: command.conversationId },
        'getAllPendingToolApprovals failed; confirming clicked tool only'
      );
    }

    return parsed.toolUseIds;
  }

  private async getExternalSessionId(command: ConfirmToolApprovalCommand): Promise<string | undefined> {
    const conversation = await this.conversationRepository.findOne(
      {
        _id: command.conversationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['externalSessionId']
    );

    return conversation?.externalSessionId;
  }

  private deleteApprovalCard(command: ConfirmToolApprovalCommand): void {
    if (!command.sourceMessageId || !command.platform || !command.platformThreadId) {
      return;
    }

    this.outboundGateway
      .deleteInConversation(
        command.agentId,
        command.integrationIdentifier,
        command.platform,
        command.platformThreadId,
        command.sourceMessageId
      )
      .catch((err) => {
        this.logger.warn(err, 'Failed to delete tool approval card after user verdict');
      });
  }

  private updatePlanProgress(command: ConfirmToolApprovalCommand, parsed: ParsedToolApprovalAction): void {
    if (!parsed.approved) {
      for (const toolUseId of parsed.toolUseIds) {
        this.handlePlanProgress
          .execute(
            HandlePlanProgressCommand.create({
              userId: command.userId,
              environmentId: command.environmentId,
              organizationId: command.organizationId,
              conversationId: command.conversationId,
              agentIdentifier: command.agentIdentifier,
              integrationIdentifier: command.integrationIdentifier,
              toolProgress: {
                action: 'tool-use',
                toolUseId,
                status: 'error',
                details: 'Denied',
              },
            })
          )
          .catch((err) => {
            this.logger.warn(err, 'Failed to update plan card after tool denial');
          });
      }

      return;
    }

    this.handlePlanProgress
      .execute(
        HandlePlanProgressCommand.create({
          userId: command.userId,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          conversationId: command.conversationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          toolProgress: {
            action: 'approved',
          },
        })
      )
      .catch((err) => {
        this.logger.warn(err, 'Failed to update plan card after tool approval verdict');
      });
  }
}
