import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentMcpServerRepository, McpConnectionRepository, SubscriberRepository } from '@novu/dal';

import { ManagedAgentService } from '../../services/managed-agent.service';
import { HandleAgentReplyCommand } from '../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../handle-agent-reply/handle-agent-reply.usecase';
import { HandlePlanProgressCommand } from '../handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../handle-plan-progress/handle-plan-progress.usecase';
import { buildToolApprovalVerdictCard } from './approval-card.builder';
import { ConfirmToolApprovalCommand } from './confirm-tool-approval.command';
import { mergeToolTrustPatch, resolveTrustForPendingTool } from './tool-trust.helper';

@Injectable()
export class ConfirmToolApproval {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly managedAgentService: ManagedAgentService,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ConfirmToolApprovalCommand): Promise<void> {
    const { parsed } = command;
    let persistTrust: { connectionId: string; toolName: string; scope: 'tool' | 'server' } | undefined;

    // "Approve & always allow …": save always_allow on the MCP connection (from action.id),
    // then tell the runtime to continue the paused agent turn.
    if (parsed.approved && parsed.persistScope && command.subscriberId) {
      const subscriber = await this.subscriberRepository.findBySubscriberId(
        command.environmentId,
        command.subscriberId
      );
      const toolName = parsed.toolName;
      const mcpServerName = parsed.mcpServerName;

      if (subscriber && mcpServerName && toolName) {
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

        if (resolution) {
          persistTrust = {
            connectionId: resolution.connection._id,
            toolName,
            scope: parsed.persistScope,
          };
        }
      }
    }

    if (parsed.approved && persistTrust) {
      await this.mcpConnectionRepository.mergeToolTrust({
        connectionId: persistTrust.connectionId,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        patch: mergeToolTrustPatch({
          scope: persistTrust.scope,
          toolName: persistTrust.toolName,
        }),
      });
    }

    await this.managedAgentService.resumeWithToolResults({
      conversationId: command.conversationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      subscriberId: command.subscriberId,
      platform: command.platform,
      toolUseIds: parsed.toolUseIds,
      approved: parsed.approved,
      turnId: parsed.turnId,
    });

    if (command.sourceMessageId) {
      const verdictCard = buildToolApprovalVerdictCard(parsed.approved, parsed.toolUseIds.length, command.actionValue);
      this.handleAgentReply
        .execute(
          HandleAgentReplyCommand.create({
            userId: command.userId,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            conversationId: command.conversationId,
            agentIdentifier: command.agentIdentifier,
            integrationIdentifier: command.integrationIdentifier,
            edit: { messageId: command.sourceMessageId, content: { card: verdictCard } },
          })
        )
        .catch((err) => {
          this.logger.warn(err, 'Failed to update tool approval card with verdict');
        });
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
            turnId: parsed.turnId,
            action: parsed.approved ? 'approved' : 'denied',
          },
        })
      )
      .catch((err) => {
        this.logger.warn(err, 'Failed to update plan card after tool approval verdict');
      });
  }
}
