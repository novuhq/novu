import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository, type VoiceCallEnded } from '@novu/dal';
import { HumanChannelViaEnum, HumanInteractionStatusEnum, VoiceCallEndReasonEnum } from '@novu/shared';
import { endReasonFromTermination } from '../../../agents/channels/voice/voice-call-end-reason';
import { endVoiceCallHandoff, readVoiceCallHandoff } from '../../../agents/channels/voice/voice-call-handoff';
import { isVoiceCallStale } from '../../../agents/channels/voice/voice-call-staleness';
import {
  HumanInteractionSettlementService,
  voiceCallCanStillBeAnswered,
} from '../../../agents/human-relay/human-interaction-settlement.service';

export type PostCallTranscriptionEvent = {
  type: 'post_call_transcription';
  data?: {
    conversation_id?: string;
    status?: string;
    metadata?: {
      call_duration_secs?: number;
      termination_reason?: string;
    };
  };
};

/**
 * A connected call ended (person hung up, max duration, etc.). Stamps the
 * delivery, drops the Redis handoff, and expires the interaction when nobody
 * else can still answer.
 */
@Injectable()
export class RecordVoiceCallEnded {
  constructor(
    private readonly cacheService: CacheService,
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(event: PostCallTranscriptionEvent): Promise<void> {
    if (event.type !== 'post_call_transcription') {
      return;
    }

    const conversationId = event.data?.conversation_id;
    if (!conversationId) {
      this.logger.warn('Voice post-call event had no conversation id');

      return;
    }

    const entry = await readVoiceCallHandoff(this.cacheService, conversationId);
    if (!entry) {
      this.logger.warn({ conversationId }, 'Voice post-call event had no call lookup');

      return;
    }

    const interaction = await this.humanInteractionRepository.findByPlatformMessageId(entry.environmentId, [
      conversationId,
    ]);
    if (!interaction) {
      // Dial and Redis registration happen before the delivery stamp. A short call
      // can end in that window. Ask ElevenLabs to retry, the same as a failure webhook.
      throw new ServiceUnavailableException('The voice call is not stored yet.');
    }

    await this.closeConnectedCall({
      interaction,
      elevenLabsConversationId: conversationId,
      endReason: endReasonFromTermination(event.data?.metadata?.termination_reason),
      durationSeconds: event.data?.metadata?.call_duration_secs,
    });
  }

  /**
   * Shared by the webhook and the staleness check. Idempotent when the
   * delivery is already ended.
   */
  async closeConnectedCall(params: {
    interaction: HumanInteractionEntity;
    elevenLabsConversationId: string;
    endReason: VoiceCallEndReasonEnum;
    durationSeconds?: number;
  }): Promise<HumanInteractionEntity | null> {
    const { interaction, elevenLabsConversationId, endReason, durationSeconds } = params;
    const delivery = (interaction.deliveries ?? []).find((item) => item.platformMessageId === elevenLabsConversationId);
    if (!delivery) {
      return null;
    }

    await endVoiceCallHandoff(this.cacheService, elevenLabsConversationId);

    const ended: VoiceCallEnded = {
      reason: endReason,
      endedAt: new Date().toISOString(),
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
    };
    const marked = await this.humanInteractionRepository.markVoiceDeliveryEnded(
      interaction._environmentId,
      interaction._id,
      elevenLabsConversationId,
      delivery.subscriberId,
      ended
    );
    const current =
      marked ??
      (await this.humanInteractionRepository.findByIdentifier(interaction._environmentId, interaction.identifier));
    if (!current || current.status !== HumanInteractionStatusEnum.PENDING) {
      return current;
    }

    // Later recipients may still be dialing. Closing here would expire the row
    // before their delivery is stamped. The failure webhook uses the same guard.
    if (voiceCallCanStillBeAnswered(current, false)) {
      return current;
    }

    const expired = await this.settlement.settle(current, HumanInteractionStatusEnum.EXPIRED);
    if (!expired) {
      this.logger.warn(
        { conversationId: elevenLabsConversationId, interactionId: interaction.identifier },
        'Voice call ended but the interaction was no longer pending'
      );
    }

    return expired ?? current;
  }

  /**
   * Lazy backstop when ElevenLabs drops a post-call webhook. Called from
   * voice_turn, interaction reads, and the live-call check before a new dial.
   * A call that has not reached the bridge yet has no `lastBridgeRequestAt` and is left alone.
   */
  async expireIfStale(interaction: HumanInteractionEntity): Promise<HumanInteractionEntity> {
    if (interaction.status !== HumanInteractionStatusEnum.PENDING) {
      return interaction;
    }

    const liveDeliveries = (interaction.deliveries ?? []).filter(
      (delivery) =>
        delivery.platform === HumanChannelViaEnum.VOICE && !delivery.voiceFailure && !delivery.voiceCallEnded
    );
    if (liveDeliveries.length === 0) {
      return interaction;
    }

    let closed = false;
    for (const delivery of liveDeliveries) {
      const handoff = await readVoiceCallHandoff(this.cacheService, delivery.platformMessageId);
      if (!handoff) {
        continue;
      }

      const alreadyEnded = handoff.status === 'ended';
      if (!alreadyEnded && (handoff.status !== 'live' || !isVoiceCallStale(handoff.lastBridgeRequestAt))) {
        continue;
      }

      await this.closeConnectedCall({
        interaction,
        elevenLabsConversationId: delivery.platformMessageId,
        endReason: alreadyEnded ? VoiceCallEndReasonEnum.OTHER : VoiceCallEndReasonEnum.STALE,
      });
      closed = true;
    }

    if (!closed) {
      return interaction;
    }

    return (
      (await this.humanInteractionRepository.findByIdentifier(interaction._environmentId, interaction.identifier)) ??
      interaction
    );
  }
}
