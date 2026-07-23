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

interface ConversationGroup {
  envelopes: AgentEventEnvelope[];
  originalIndexes: number[];
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
    const groups = this.groupByConversationId(envelopes);
    const outcomesByIndex = new Map<number, IngestOutcome>();

    for (const [conversationId, group] of groups) {
      await this.ingestConversationGroup(conversationId, group, command, outcomesByIndex);
    }

    const results: IngestAgentEventResult[] = [];

    for (let index = 0; index < envelopes.length; index += 1) {
      const outcome = outcomesByIndex.get(index);

      if (outcome) {
        results.push({ sequence: envelopes[index].sequence, status: outcome });
      }
    }

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

  private groupByConversationId(envelopes: AgentEventEnvelope[]): Map<string, ConversationGroup> {
    const groups = new Map<string, ConversationGroup>();

    for (let index = 0; index < envelopes.length; index += 1) {
      const envelope = envelopes[index];
      const existing = groups.get(envelope.conversationId);

      if (existing) {
        existing.envelopes.push(envelope);
        existing.originalIndexes.push(index);
        continue;
      }

      groups.set(envelope.conversationId, {
        envelopes: [envelope],
        originalIndexes: [index],
      });
    }

    return groups;
  }

  private async ingestConversationGroup(
    conversationId: string,
    group: ConversationGroup,
    command: IngestAgentEventsCommand,
    outcomesByIndex: Map<number, IngestOutcome>
  ): Promise<void> {
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

      return;
    }

    const channel = conversation.channels?.[0];

    if (!channel) {
      this.logger.warn(
        { conversationId, environmentId: command.environmentId },
        'Skipping agent event batch entries — conversation has no channel'
      );

      return;
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

      return;
    }

    const validEnvelopes: AgentEventEnvelope[] = [];
    const validOriginalIndexes: number[] = [];
    let referenceAgent: { _id: string; identifier: string } | null = null;
    // A batch from one SDK run repeats the same agentId for every envelope; memoize by
    // identifier instead of re-querying Mongo once per envelope.
    const agentsByIdentifier = new Map<string, { _id: string; identifier: string } | null>();

    for (let index = 0; index < group.envelopes.length; index += 1) {
      const envelope = group.envelopes[index];
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
      validOriginalIndexes.push(group.originalIndexes[index]);
    }

    if (validEnvelopes.length === 0 || !referenceAgent) {
      return;
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

    for (let index = 0; index < validEnvelopes.length; index += 1) {
      outcomesByIndex.set(validOriginalIndexes[index], outcomes[index]);
    }
  }
}

function parsePlatform(value: string): AgentPlatformEnum | undefined {
  if ((Object.values(AgentPlatformEnum) as string[]).includes(value)) {
    return value as AgentPlatformEnum;
  }

  return undefined;
}
