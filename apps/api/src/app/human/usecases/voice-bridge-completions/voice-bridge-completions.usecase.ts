import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CacheService, PinoLogger, shortId } from '@novu/application-generic';
import {
  ConversationActivityRepository,
  ConversationActivitySenderTypeEnum,
  ConversationEntity,
  ConversationRepository,
  HumanInteractionDelivery,
  HumanInteractionEntity,
  HumanInteractionRepository,
} from '@novu/dal';
import { HUMAN_INTERACTION_TERMINAL_STATUSES, HumanChannelViaEnum, HumanInteractionStatusEnum } from '@novu/shared';
import type { Response } from 'express';
import { userUtteranceTexts } from '../../../agents/channels/voice/extract-inbound-utterances';
import {
  type ChatCompletionRequest,
  sseChunk,
  sseDone,
  sseFinish,
  sseKeepAlive,
  sseToolCallChunk,
} from '../../../agents/channels/voice/openai-sse';
import {
  VOICE_BRIDGE_CLAIM_POLL_MS,
  VOICE_BRIDGE_KEEPALIVE_MS,
  voiceBridgeParkMs,
} from '../../../agents/channels/voice/voice-bridge-config';
import {
  claimAgentLine,
  readVoiceCallHandoff,
  recordInboundUtterances,
} from '../../../agents/channels/voice/voice-call-handoff';

export type VoiceBridgeCorrelation = {
  interactionId: string;
  environmentId: string;
  subscriberId: string;
};

type ResolvedVoiceCall = {
  interaction: HumanInteractionEntity;
  delivery: HumanInteractionDelivery;
  conversation: ConversationEntity;
};

/**
 * ElevenLabs custom LLM bridge. Parks the SSE response until the calling agent
 * posts a line via voice_turn, then streams that line. Fillers belong to the
 * shell's soft timeout — an expired park finishes with no spoken content.
 */
@Injectable()
export class VoiceBridgeCompletions {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(params: { body: ChatCompletionRequest; res: Response; signal?: AbortSignal }): Promise<void> {
    const correlation = readCorrelation(params.body);
    const resolved = await this.resolveLiveCall(correlation);
    const known = await readVoiceCallHandoff(this.cacheService, resolved.delivery.platformMessageId);
    if (!known || known.status === 'ended') {
      throw new BadRequestException('This voice call has already ended.');
    }

    const recorded = await recordInboundUtterances(
      this.cacheService,
      resolved.delivery.platformMessageId,
      userUtteranceTexts(params.body.messages)
    );
    if (!recorded) {
      throw new BadRequestException('This voice call has already ended.');
    }

    await this.appendInboundUtterances(resolved, recorded.appended);

    const claimed = await this.parkForAgentLine({
      conversationId: resolved.delivery.platformMessageId,
      res: params.res,
      signal: params.signal,
    });

    if (params.res.writableEnded || params.res.destroyed) {
      return;
    }

    if (claimed) {
      await this.appendOutboundUtterance(resolved, claimed.line);
      params.res.write(sseChunk(claimed.line));
    }

    if (claimed?.hangupRequested) {
      params.res.write(
        sseToolCallChunk({
          id: `call_${shortId(8)}`,
          type: 'function',
          function: { name: 'end_call', arguments: '{}' },
        })
      );
      params.res.write(sseFinish('tool_calls'));
    } else {
      params.res.write(sseFinish('stop'));
    }

    params.res.write(sseDone());
    params.res.end();

    this.logger.debug(
      {
        interactionId: correlation.interactionId,
        conversationId: resolved.conversation._id,
        inboundSeq: recorded.handoff.inboundSeq,
        spoke: Boolean(claimed),
        hangup: Boolean(claimed?.hangupRequested),
      },
      'Voice bridge turn completed'
    );
  }

  private async resolveLiveCall(correlation: VoiceBridgeCorrelation): Promise<ResolvedVoiceCall> {
    const interaction = await this.humanInteractionRepository.findByIdentifier(
      correlation.environmentId,
      correlation.interactionId
    );
    if (!interaction) {
      throw new NotFoundException('Unknown voice call.');
    }

    if ((HUMAN_INTERACTION_TERMINAL_STATUSES as readonly HumanInteractionStatusEnum[]).includes(interaction.status)) {
      throw new BadRequestException('This interaction is already settled.');
    }

    if (interaction.status !== HumanInteractionStatusEnum.PENDING) {
      throw new BadRequestException('This interaction is not waiting on a call.');
    }

    const delivery = (interaction.deliveries ?? []).find(
      (item) =>
        item.platform === HumanChannelViaEnum.VOICE &&
        item.subscriberId === correlation.subscriberId &&
        !item.voiceFailure &&
        !item.voiceCallEnded
    );
    if (!delivery) {
      throw new NotFoundException('No live voice delivery for this contact.');
    }

    const conversation = await this.conversationRepository.findByChannelThread(
      correlation.environmentId,
      delivery.platformThreadId
    );
    if (!conversation) {
      throw new NotFoundException('Voice call thread was not found.');
    }

    return { interaction, delivery, conversation };
  }

  private async appendInboundUtterances(resolved: ResolvedVoiceCall, utterances: string[]): Promise<void> {
    if (utterances.length === 0) {
      return;
    }

    const channel = resolved.conversation.channels[0];
    if (!channel) {
      return;
    }

    for (const text of utterances) {
      await this.conversationActivityRepository.createUserActivity({
        identifier: `act_${shortId(12)}`,
        conversationId: resolved.conversation._id,
        platform: HumanChannelViaEnum.VOICE,
        integrationId: String(channel._integrationId),
        platformThreadId: channel.platformThreadId,
        senderType: ConversationActivitySenderTypeEnum.SUBSCRIBER,
        senderId: resolved.delivery.subscriberId,
        content: text,
        environmentId: String(resolved.conversation._environmentId),
        organizationId: String(resolved.conversation._organizationId),
      });
    }

    const nowIso = new Date().toISOString();
    await this.conversationRepository.touchActivity(
      String(resolved.conversation._environmentId),
      String(resolved.conversation._organizationId),
      resolved.conversation._id,
      utterances[utterances.length - 1].slice(0, 200),
      null,
      { humanMessageAt: nowIso }
    );
  }

  private async appendOutboundUtterance(resolved: ResolvedVoiceCall, line: string): Promise<void> {
    const channel = resolved.conversation.channels[0];
    if (!channel) {
      return;
    }

    await this.conversationActivityRepository.createAgentActivity({
      identifier: `act_${shortId(12)}`,
      conversationId: resolved.conversation._id,
      platform: HumanChannelViaEnum.VOICE,
      integrationId: String(channel._integrationId),
      platformThreadId: channel.platformThreadId,
      agentId: String(resolved.conversation._agentId),
      content: line,
      environmentId: String(resolved.conversation._environmentId),
      organizationId: String(resolved.conversation._organizationId),
    });
  }

  private async parkForAgentLine(params: {
    conversationId: string;
    res: Response;
    signal?: AbortSignal;
  }): Promise<{ line: string; hangupRequested: boolean } | null> {
    const deadline = Date.now() + voiceBridgeParkMs();
    let keepaliveIn = 0;

    while (Date.now() < deadline) {
      if (responseClosed(params.res, params.signal)) {
        return null;
      }

      const claimed = await claimAgentLine(this.cacheService, params.conversationId);
      if (claimed) {
        return claimed;
      }

      keepaliveIn += VOICE_BRIDGE_CLAIM_POLL_MS;
      if (keepaliveIn >= VOICE_BRIDGE_KEEPALIVE_MS) {
        params.res.write(sseKeepAlive());
        keepaliveIn = 0;
      }

      await sleep(VOICE_BRIDGE_CLAIM_POLL_MS);
    }

    if (responseClosed(params.res, params.signal)) {
      return null;
    }

    return claimAgentLine(this.cacheService, params.conversationId);
  }
}

export function readCorrelation(body: ChatCompletionRequest): VoiceBridgeCorrelation {
  const extra = body.elevenlabs_extra_body ?? {};
  const nested =
    typeof extra === 'object' && extra !== null && !Array.isArray(extra) ? (extra as Record<string, unknown>) : {};

  const interactionId = stringField(nested, 'interactionId');
  const environmentId = stringField(nested, 'environmentId');
  const subscriberId = stringField(nested, 'subscriberId');

  if (!interactionId || !environmentId || !subscriberId) {
    throw new BadRequestException(
      'Voice bridge requests need interactionId, environmentId, and subscriberId in elevenlabs_extra_body.'
    );
  }

  return { interactionId, environmentId, subscriberId };
}

function stringField(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];

  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function responseClosed(res: Response, signal?: AbortSignal): boolean {
  return Boolean(signal?.aborted || res.writableEnded || res.destroyed);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
