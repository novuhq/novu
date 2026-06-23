import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { OutboundGateway } from '../../conversation-runtime/egress/outbound.gateway';
import { HandlePlanProgressCommand } from '../../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.command';
import { HandlePlanProgress } from '../../conversation-runtime/reply/handle-plan-progress/handle-plan-progress.usecase';
import { ManagedAgentService } from '../managed-agent.service';
import { type ParsedToolApprovalAction } from './approval-card.builder';
import { ConfirmToolApprovalCommand } from './confirm-tool-approval.command';
import { ToolTrustService } from './tool-trust.service';

@Injectable()
export class ConfirmToolApproval {
  constructor(
    private readonly managedAgentService: ManagedAgentService,
    private readonly outboundGateway: OutboundGateway,
    private readonly handlePlanProgress: HandlePlanProgress,
    private readonly toolTrustService: ToolTrustService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ConfirmToolApprovalCommand): Promise<void> {
    const { parsed } = command;

    await this.persistTrustIfNeeded(command, parsed);

    await this.managedAgentService.sendToolResult({
      conversationId: command.conversationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      subscriberId: command.subscriberId,
      toolUseId: parsed.toolUseId,
      approved: parsed.approved,
      platform: command.platform,
      platformThreadId: command.platformThreadId,
    });

    this.deleteApprovalCard(command);
    this.updatePlanProgress(command, parsed);
  }

  private async persistTrustIfNeeded(
    command: ConfirmToolApprovalCommand,
    parsed: ParsedToolApprovalAction
  ): Promise<void> {
    if (!parsed.trust) {
      return;
    }

    try {
      const persisted = await this.toolTrustService.persist({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentIdentifier: command.agentIdentifier,
        subscriberExternalId: command.subscriberId,
        target: parsed.trust,
      });

      if (!persisted) {
        // No subscriber/agent to attach the preference to: the approval proceeds
        // as a one-off, so the card will reappear next time. Logged to make that
        // (otherwise silent) miss diagnosable.
        this.logger.debug(
          { agentIdentifier: command.agentIdentifier, subscriberId: command.subscriberId },
          'Tool trust preference not persisted (no subscriber/agent); approval is one-off'
        );
      }
    } catch (err) {
      // A failed preference write must not block the approval itself.
      this.logger.warn(err, 'Failed to persist tool trust preference; approval will proceed as a one-off');
    }
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
              toolUseId: parsed.toolUseId,
              status: 'error',
              details: 'Denied',
            },
          })
        )
        .catch((err) => {
          this.logger.warn(err, 'Failed to update plan card after tool denial');
        });

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
