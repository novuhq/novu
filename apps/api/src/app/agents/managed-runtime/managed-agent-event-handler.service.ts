import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { type SessionEventContext, type StreamCallbacks, type StreamPart } from '@novu/thalamus';
import { AgentEventContext, AgentEventSink } from '../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { mapStreamPart, RunEventBuilder } from './stream-part-mapper';

/**
 * Thin dual adapter: feature flag selects which Thalamus callback surface feeds
 * the shared AgentEventSink. SessionEventsFactory is sync, so the flag is
 * resolved once on the first event and cached for the rest of the turn.
 */
@Injectable()
export class ManagedAgentEventHandler {
  constructor(
    private readonly agentEventSink: AgentEventSink,
    private readonly featureFlagsService: FeatureFlagsService,
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
      sessionId,
      suppressReply: metadata.suppressReply === 'true',
    };

    let protocolEnabled: boolean | undefined;
    const resolveProtocolEnabled = async (): Promise<boolean> => {
      if (protocolEnabled === undefined) {
        protocolEnabled = await this.isProtocolEnabled(metadata);
      }

      return protocolEnabled;
    };

    const ingestPart = async (part: StreamPart): Promise<void> => {
      // One StreamPart can expand to multiple AgentEvents (e.g. finish →
      // tool-approval-request* + run-finish). Ingest as a batch so paused
      // finish can pair with those approval requests without a process Map.
      await this.agentEventSink.ingestMany(builder.wrap(mapStreamPart(part)), agentEventContext);
    };

    return {
      onPart: async (part) => {
        if (!(await resolveProtocolEnabled())) {
          return;
        }

        await ingestPart(part);
      },

      onToolUseStart: async (part) => {
        if (await resolveProtocolEnabled()) {
          return;
        }

        await ingestPart(part);
      },

      onToolUseDone: async (part) => {
        if (await resolveProtocolEnabled()) {
          return;
        }

        await ingestPart(part);
      },

      // TODO(agents): also persist a TOOL_RESULT activity once Thalamus sends the tool output
      // (today this event only has { toolUseId, isError }), so the ledger holds the full tool trail.
      onToolUseResult: async (part) => {
        if (await resolveProtocolEnabled()) {
          return;
        }

        await ingestPart(part);
      },

      onMessage: async (part) => {
        if (await resolveProtocolEnabled()) {
          return;
        }

        await ingestPart(part);
      },

      onFinish: async (part) => {
        if (await resolveProtocolEnabled()) {
          return;
        }

        await ingestPart(part);
      },

      onError: async (part) => {
        if (await resolveProtocolEnabled()) {
          return;
        }

        await ingestPart(part);
      },

      onMcpServerFailure: async (part) => {
        if (await resolveProtocolEnabled()) {
          return;
        }

        await ingestPart(part);
      },
    };
  }

  private async isProtocolEnabled(metadata: Record<string, string>): Promise<boolean> {
    const organizationId = metadata.organizationId;
    const environmentId = metadata.environmentId;

    if (!organizationId || !environmentId) {
      return false;
    }

    return this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_AGENT_EVENT_PROTOCOL_ENABLED,
      defaultValue: false,
      organization: { _id: organizationId },
      environment: { _id: environmentId },
    });
  }
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
