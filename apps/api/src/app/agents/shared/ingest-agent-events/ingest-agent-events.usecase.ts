import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type AgentEventEnvelope, isAgentEventEnvelope } from '@novu/agent-event-protocol';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { AgentRepository, IntegrationRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { AgentConversationService } from '../../conversation-runtime/conversation/agent-conversation.service';
import { AgentEventContext, AgentEventSink, type IngestOutcome } from '../agent-event-sink.service';
import { AgentPlatformEnum } from '../enums/agent-platform.enum';
import { IngestAgentEventsCommand } from './ingest-agent-events.command';

export interface IngestAgentEventResult {
  sequence: number;
  status: IngestOutcome;
}

export interface IngestAgentEventsResult {
  results: IngestAgentEventResult[];
}

@Injectable()
export class IngestAgentEvents {
  constructor(
    private readonly agentEventSink: AgentEventSink,
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly conversationService: AgentConversationService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: IngestAgentEventsCommand): Promise<IngestAgentEventsResult> {
    await this.assertProtocolEnabled(command.organizationId, command.environmentId);

    const invalidIndexes = command.events
      .map((event, index) => (isAgentEventEnvelope(event) ? null : index))
      .filter((index): index is number => index !== null);

    if (invalidIndexes.length > 0) {
      throw new BadRequestException(`Invalid event envelopes at indexes: ${invalidIndexes.join(', ')}`);
    }

    const envelopes = command.events as unknown as AgentEventEnvelope[];

    // SDK outbox is constructed per-turn with a fixed conversationId; a mixed batch is always a client error.
    const conversationIds = new Set(envelopes.map((envelope) => envelope.conversationId));

    if (conversationIds.size > 1) {
      throw new BadRequestException('All events in a batch must belong to the same conversation');
    }

    const results = await this.ingestBatch(envelopes, command);

    return { results };
  }

  private async assertProtocolEnabled(organizationId: string, environmentId: string): Promise<void> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    });

    if (!isEnabled) {
      throw new NotFoundException();
    }
  }

  private async ingestBatch(
    envelopes: AgentEventEnvelope[],
    command: IngestAgentEventsCommand
  ): Promise<IngestAgentEventResult[]> {
    if (envelopes.length === 0) {
      return [];
    }

    const conversationId = envelopes[0].conversationId;
    const conversation = await this.conversationService.getConversation(
      conversationId,
      command.environmentId,
      command.organizationId
    );

    if (!conversation) {
      this.logger.warn(
        { conversationId, environmentId: command.environmentId },
        'Skipping agent event batch entries — conversation not found'
      );

      return [];
    }

    const channel = conversation.channels?.[0];

    if (!channel) {
      this.logger.warn(
        { conversationId, environmentId: command.environmentId },
        'Skipping agent event batch entries — conversation has no channel'
      );

      return [];
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
        'Skipping agent event batch entries — integration not found for conversation channel'
      );

      return [];
    }

    const validEnvelopes: AgentEventEnvelope[] = [];
    let referenceAgent: { _id: string; identifier: string } | null = null;
    // A batch from one SDK run repeats the same agentId for every envelope; memoize by
    // identifier instead of re-querying Mongo once per envelope.
    const agentsByIdentifier = new Map<string, { _id: string; identifier: string } | null>();

    for (const envelope of envelopes) {
      let agent = agentsByIdentifier.get(envelope.agentId);

      if (agent === undefined) {
        agent = await this.agentRepository.findOne(
          {
            _environmentId: command.environmentId,
            _organizationId: command.organizationId,
            identifier: envelope.agentId,
          },
          { _id: 1, identifier: 1 }
        );
        agentsByIdentifier.set(envelope.agentId, agent);
      }

      if (!agent) {
        this.logger.warn(
          { conversationId, agentIdentifier: envelope.agentId },
          'Skipping agent event envelope — agent not found'
        );
        continue;
      }

      if (String(agent._id) !== conversation._agentId) {
        this.logger.warn(
          { conversationId, agentIdentifier: envelope.agentId, conversationAgentId: conversation._agentId },
          'Skipping agent event envelope — agent identifier does not match conversation'
        );
        continue;
      }

      referenceAgent ??= agent;
      validEnvelopes.push(envelope);
    }

    if (validEnvelopes.length === 0 || !referenceAgent) {
      return [];
    }

    const context: AgentEventContext = {
      userId: command.userId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      conversationId: String(conversation._id),
      agentIdentifier: referenceAgent.identifier,
      integrationIdentifier: integration.identifier,
      agentId: referenceAgent._id,
      platform: parsePlatform(channel.platform),
      platformThreadId: channel.platformThreadId,
      source: 'bridge',
    };

    const outcomes = await this.agentEventSink.ingestMany(validEnvelopes, context);
    const results: IngestAgentEventResult[] = [];

    for (let index = 0; index < validEnvelopes.length; index += 1) {
      results.push({ sequence: validEnvelopes[index].sequence, status: outcomes[index] });
    }

    return results;
  }
}

function parsePlatform(value: string): AgentPlatformEnum | undefined {
  if ((Object.values(AgentPlatformEnum) as string[]).includes(value)) {
    return value as AgentPlatformEnum;
  }

  return undefined;
}
