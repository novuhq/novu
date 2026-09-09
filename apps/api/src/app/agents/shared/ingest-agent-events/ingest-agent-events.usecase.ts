import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type AgentEventEnvelope, isAgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { AgentConversationService } from '../../conversation-runtime/conversation/agent-conversation.service';
import { resolveLifecycleChannel } from '../../conversation-runtime/conversation/run-lifecycle-activity';
import { AgentEventContext, AgentEventSink } from '../agent-event-sink.service';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import { IngestAgentEventsCommand } from './ingest-agent-events.command';

/**
 * SDK-native AgentEvent ingest. Success is HTTP 200 with an empty/minimal body
 * (status-only ack). Soft skips are hard failures: 404 for missing conversation,
 * 400 for bad client ids / agent mismatch / mixed batch identity.
 */
@Injectable()
export class IngestAgentEvents {
  constructor(
    private readonly agentEventSink: AgentEventSink,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationService: AgentConversationService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: IngestAgentEventsCommand): Promise<void> {
    const envelopes: AgentEventEnvelope[] = [];
    const invalidIndexes: number[] = [];

    for (const [index, event] of command.events.entries()) {
      if (isAgentEventEnvelope(event)) {
        envelopes.push(event);
      } else {
        invalidIndexes.push(index);
      }
    }

    if (invalidIndexes.length > 0) {
      throw new BadRequestException(`Invalid event envelopes at indexes: ${invalidIndexes.join(', ')}`);
    }

    // SDK outbox stamps one conversationId and one agentId per turn; a mixed batch is always a client error.
    const conversationIds = new Set(envelopes.map((envelope) => envelope.conversationId));

    if (conversationIds.size > 1) {
      throw new BadRequestException('All events in a batch must belong to the same conversation');
    }

    const agentIds = new Set(envelopes.map((envelope) => envelope.agentId));

    if (agentIds.size > 1) {
      throw new BadRequestException('All events in a batch must belong to the same agent');
    }

    await this.ingestBatch(envelopes, command);
  }

  private async ingestBatch(envelopes: AgentEventEnvelope[], command: IngestAgentEventsCommand): Promise<void> {
    if (envelopes.length === 0) {
      return;
    }

    const conversationId = envelopes[0].conversationId;
    const agentIdentifier = envelopes[0].agentId;
    const conversation = await this.conversationService.getConversation(
      conversationId,
      command.environmentId,
      command.organizationId
    );

    // Soft-skip → hard failure: missing conversation is not a client id typo we can
    // repair by retrying; callers must stop. Prefer 404 over 400 for "resource gone".
    if (!conversation) {
      this.logger.warn(
        { conversationId, environmentId: command.environmentId },
        'Rejecting agent event batch — conversation not found'
      );

      throw new NotFoundException('Conversation not found');
    }

    // 400: client sent a conversation that cannot accept events (bad/incomplete setup ids).
    const channel = conversation.channels?.[0];

    if (!channel) {
      this.logger.warn(
        { conversationId, environmentId: command.environmentId },
        'Rejecting agent event batch — conversation has no channel'
      );

      throw new BadRequestException('Conversation has no channel');
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: channel._integrationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      { identifier: 1 }
    );

    if (!integration?.identifier) {
      this.logger.warn(
        { conversationId, integrationId: channel._integrationId },
        'Rejecting agent event batch — integration not found for conversation channel'
      );

      throw new BadRequestException('Integration not found for conversation channel');
    }

    const agent = await this.agentRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        identifier: agentIdentifier,
      },
      { _id: 1, identifier: 1 }
    );

    if (!agent) {
      this.logger.warn({ conversationId, agentIdentifier }, 'Rejecting agent event batch — agent not found');

      throw new BadRequestException('Agent not found');
    }

    if (String(agent._id) !== conversation._agentId) {
      this.logger.warn(
        { conversationId, agentIdentifier, conversationAgentId: conversation._agentId },
        'Rejecting agent event batch — agent identifier does not match conversation'
      );

      throw new BadRequestException('Agent does not match conversation');
    }

    const lifecycleChannel = resolveLifecycleChannel(conversation);

    const context: AgentEventContext = {
      userId: command.userId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      conversationId: String(conversation._id),
      agentIdentifier: agent.identifier,
      integrationIdentifier: integration.identifier,
      agentId: agent._id,
      platform: parsePlatform(lifecycleChannel.platform),
      platformThreadId: lifecycleChannel.platformThreadId,
      channel: lifecycleChannel,
      source: 'bridge',
    };

    await this.agentEventSink.ingestMany(envelopes, context);
  }
}

function parsePlatform(value: string): AgentPlatformEnum | undefined {
  if ((Object.values(AgentPlatformEnum) as string[]).includes(value)) {
    return value as AgentPlatformEnum;
  }

  return undefined;
}
