import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { type ConversationChannel } from '@novu/dal';
import { type SessionEventContext, type StreamCallbacks } from '@novu/thalamus';
import { AgentEventContext, AgentEventSink } from '../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { mapStreamPart, RunEventBuilder } from './stream-part-mapper';

/**
 * Maps Thalamus StreamParts onto the shared AgentEventSink.
 * SessionEventsFactory is sync; handlers close over turn metadata resolved here.
 */
@Injectable()
export class ManagedAgentEventHandler {
  constructor(
    private readonly agentEventSink: AgentEventSink,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  createHandlers(context: SessionEventContext): StreamCallbacks {
    const { sessionId, metadata } = context;

    if (!metadata.conversationId || !metadata.environmentId || !metadata.organizationId) {
      this.logger.error(`Webhook event missing required metadata: session=${sessionId}`);

      return {};
    }

    const builder = new RunEventBuilder({
      conversationId: metadata.conversationId,
      agentId: metadata.agentId ?? '',
      turnId: context.turnId,
      runId: context.runId,
    });
    const agentEventContext: AgentEventContext = {
      userId: metadata.organizationId,
      environmentId: metadata.environmentId,
      organizationId: metadata.organizationId,
      conversationId: metadata.conversationId,
      agentIdentifier: metadata.agentIdentifier ?? '',
      integrationIdentifier: metadata.integrationIdentifier ?? '',
      agentId: metadata.agentId,
      subscriberId: metadata.subscriberId,
      platform: parsePlatform(metadata.platform),
      platformThreadId: metadata.platformThreadId,
      channel: channelFromWebhookMetadata(metadata),
      sessionId,
      suppressReply: metadata.suppressReply === 'true',
      source: 'managed',
    };

    return {
      onPart: async (part) => {
        // One StreamPart can expand to multiple AgentEvents (e.g. finish →
        // tool-approval-request* + run-finish). Ingest as a batch so paused
        // finish can pair with those approval requests without a process Map.
        await this.agentEventSink.ingestMany(builder.wrap(mapStreamPart(part)), agentEventContext);
      },
    };
  }
}

function channelFromWebhookMetadata(metadata: Record<string, string>): ConversationChannel | undefined {
  const { platform, platformThreadId, integrationId } = metadata;
  if (!platform || !platformThreadId || !integrationId) {
    return undefined;
  }

  return {
    platform,
    _integrationId: integrationId,
    platformThreadId,
  };
}

function parsePlatform(value?: string): AgentPlatformEnum | undefined {
  if (!value) {
    return undefined;
  }

  if ((Object.values(AgentPlatformEnum) as string[]).includes(value)) {
    return value as AgentPlatformEnum;
  }

  return undefined;
}
