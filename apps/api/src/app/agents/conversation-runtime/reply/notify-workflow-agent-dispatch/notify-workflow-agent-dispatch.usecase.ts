import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  IntegrationRepository,
  WorkflowAgentDispatchEntity,
  WorkflowAgentDispatchRepository,
} from '@novu/dal';
import type { SentMessageInfo } from '@novu/framework/internal';
import {
  ENDPOINT_TYPES,
  NotifyWorkflowAgentDispatchResponseDto,
  WorkflowAgentDispatchDestination,
  WorkflowAgentDispatchStatusEnum,
} from '@novu/shared';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { resolveAgentPlatform } from '../../../shared/util/provider-to-platform';
import { OutboundGateway } from '../../egress/outbound.gateway';
import { NotifyWorkflowAgentDispatchCommand } from './notify-workflow-agent-dispatch.command';

@Injectable()
export class NotifyWorkflowAgentDispatch {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly workflowAgentDispatchRepository: WorkflowAgentDispatchRepository,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: NotifyWorkflowAgentDispatchCommand): Promise<NotifyWorkflowAgentDispatchResponseDto> {
    const destination = this.parseDestination(command);
    const agent = await this.resolveAgent(command);
    const integration = await this.resolveLinkedSlackIntegration(command, agent._id);
    const platform = resolveAgentPlatform(integration.providerId);

    if (platform !== AgentPlatformEnum.SLACK) {
      throw new BadRequestException(
        `Workflow agent dispatch currently supports Slack only (got providerId=${integration.providerId})`
      );
    }

    const dispatch = await this.workflowAgentDispatchRepository.reservePending({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      integrationId: integration._id,
      idempotencyKey: command.idempotencyKey,
      platform: AgentPlatformEnum.SLACK,
      notificationId: command.origin.notificationId,
      jobId: command.origin.jobId,
      messageId: command.origin.messageId,
      transactionId: command.origin.transactionId,
      workflowIdentifier: command.origin.workflowIdentifier,
      stepId: command.origin.stepId,
      subscriberId: command.origin.subscriberId,
      destination,
      workspaceId: command.workspaceId,
      content: command.content,
    });

    const alreadySent = this.toSentResponse(dispatch);

    if (alreadySent) {
      return alreadySent;
    }

    const claimed = await this.workflowAgentDispatchRepository.claimForSend({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      dispatchId: dispatch._id,
    });

    if (!claimed) {
      return this.resolveConcurrentSend(command);
    }

    return this.sendAndComplete(command, agent._id, integration.identifier, claimed);
  }

  private async sendAndComplete(
    command: NotifyWorkflowAgentDispatchCommand,
    agentId: string,
    integrationIdentifier: string,
    dispatch: WorkflowAgentDispatchEntity
  ): Promise<NotifyWorkflowAgentDispatchResponseDto> {
    const content = dispatch.content ?? command.content;
    const { destination } = dispatch;
    let sent: SentMessageInfo;

    try {
      sent =
        destination.type === ENDPOINT_TYPES.SLACK_USER
          ? await this.outboundGateway.sendDirectMessage(
              agentId,
              integrationIdentifier,
              destination.userId,
              { markdown: content },
              dispatch.workspaceId
            )
          : await this.outboundGateway.sendChannelMessage(
              agentId,
              integrationIdentifier,
              destination.channelId,
              { markdown: content },
              dispatch.workspaceId
            );
    } catch (error) {
      await this.workflowAgentDispatchRepository.markFailed({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        dispatchId: dispatch._id,
      });

      this.logger.error(
        {
          err: error,
          dispatchId: dispatch._id,
          agentId,
          integrationIdentifier,
          idempotencyKey: command.idempotencyKey,
        },
        'Failed to send workflow agent dispatch'
      );

      throw error;
    }

    try {
      await this.workflowAgentDispatchRepository.markSent({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        dispatchId: dispatch._id,
        platformThreadId: sent.platformThreadId,
        platformMessageId: sent.messageId,
      });
    } catch (error) {
      // Delivered on the platform — keep SENDING so claimForSend cannot re-send, but still
      // persist thread/message ids so inbound hydration and idempotent replays can succeed.
      this.logger.error(
        {
          err: error,
          dispatchId: dispatch._id,
          agentId,
          integrationIdentifier,
          idempotencyKey: command.idempotencyKey,
          platformMessageId: sent.messageId,
          platformThreadId: sent.platformThreadId,
        },
        'Workflow agent dispatch was delivered but markSent failed; persisting delivery identifiers'
      );

      try {
        await this.workflowAgentDispatchRepository.persistDeliveryIdentifiers({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          dispatchId: dispatch._id,
          platformThreadId: sent.platformThreadId,
          platformMessageId: sent.messageId,
        });
      } catch (persistError) {
        this.logger.error(
          {
            err: persistError,
            dispatchId: dispatch._id,
            agentId,
            integrationIdentifier,
            idempotencyKey: command.idempotencyKey,
            platformMessageId: sent.messageId,
            platformThreadId: sent.platformThreadId,
          },
          'Workflow agent dispatch was delivered but persisting its delivery identifiers failed'
        );
      }
    }

    return {
      dispatchId: dispatch._id,
      platformMessageId: sent.messageId,
      platformThreadId: sent.platformThreadId,
      status: WorkflowAgentDispatchStatusEnum.SENT,
    };
  }

  private async resolveConcurrentSend(
    command: NotifyWorkflowAgentDispatchCommand
  ): Promise<NotifyWorkflowAgentDispatchResponseDto> {
    const current = await this.workflowAgentDispatchRepository.findByIdempotencyKey(
      command.environmentId,
      command.organizationId,
      command.idempotencyKey
    );
    const sent = current && this.toSentResponse(current);

    if (sent) {
      return sent;
    }

    throw new ConflictException(`Workflow agent dispatch ${command.idempotencyKey} is already in flight`);
  }

  private toSentResponse(dispatch: WorkflowAgentDispatchEntity): NotifyWorkflowAgentDispatchResponseDto | null {
    // Platform ids are the source of truth for "already delivered" — status may remain SENDING
    // if markSent failed after Slack accepted the message.
    if (!dispatch.platformMessageId || !dispatch.platformThreadId) {
      return null;
    }

    return {
      dispatchId: dispatch._id,
      platformMessageId: dispatch.platformMessageId,
      platformThreadId: dispatch.platformThreadId,
      status: WorkflowAgentDispatchStatusEnum.SENT,
    };
  }

  private parseDestination(command: NotifyWorkflowAgentDispatchCommand): WorkflowAgentDispatchDestination {
    const { destination } = command;

    if (destination.type === ENDPOINT_TYPES.SLACK_USER) {
      if (!destination.userId) {
        throw new BadRequestException('destination.userId is required for slack_user');
      }

      return { type: ENDPOINT_TYPES.SLACK_USER, userId: destination.userId };
    }

    if (destination.type === ENDPOINT_TYPES.SLACK_CHANNEL) {
      if (!destination.channelId) {
        throw new BadRequestException('destination.channelId is required for slack_channel');
      }

      return { type: ENDPOINT_TYPES.SLACK_CHANNEL, channelId: destination.channelId };
    }

    throw new BadRequestException(`Unsupported destination type: ${(destination as { type: string }).type}`);
  }

  private async resolveAgent(command: NotifyWorkflowAgentDispatchCommand) {
    const byIdentifier = await this.agentRepository.findOne(
      {
        identifier: command.agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (byIdentifier) {
      return byIdentifier;
    }

    const byId = await this.agentRepository.findOne(
      {
        _id: command.agentId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!byId) {
      throw new NotFoundException(`Agent ${command.agentId} not found`);
    }

    return byId;
  }

  private async resolveLinkedSlackIntegration(command: NotifyWorkflowAgentDispatchCommand, agentId: string) {
    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationIdentifier} not found`);
    }

    const link = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agentId,
        _integrationId: integration._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!link) {
      throw new BadRequestException(
        `Integration ${command.integrationIdentifier} is not linked to agent ${command.agentId}`
      );
    }

    return integration;
  }
}
