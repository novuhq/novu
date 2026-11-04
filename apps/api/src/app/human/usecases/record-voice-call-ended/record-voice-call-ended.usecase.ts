import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AnalyticsService, CacheService, PinoLogger } from '@novu/application-generic';
import {
  EnvironmentRepository,
  HumanInteractionEntity,
  HumanInteractionRepository,
  type VoiceCallEnded,
} from '@novu/dal';
import {
  HumanChannelViaEnum,
  HumanInteractionStatusEnum,
  VOICE_CALL_MAX_MINUTES,
  VoiceCallEndReasonEnum,
} from '@novu/shared';
import { endReasonFromTermination } from '../../../agents/channels/voice/voice-call-end-reason';
import { endVoiceCallHandoff, readVoiceCallHandoff } from '../../../agents/channels/voice/voice-call-handoff';
import { isVoiceCallStale } from '../../../agents/channels/voice/voice-call-staleness';
import {
  HumanInteractionSettlementService,
  voiceCallCanStillBeAnswered,
} from '../../../agents/human-relay/human-interaction-settlement.service';
import { findAgentInboxOwner, trackAgentInboxCallEndedWithoutAnswer } from '../../services/agent-inbox-analytics';

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
    private readonly environmentRepository: EnvironmentRepository,
    private readonly analyticsService: AnalyticsService,
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
    } else {
      await this.trackEndedWithoutAnswer(expired, endReason, durationSeconds);
    }

    return expired ?? current;
  }

  private async trackEndedWithoutAnswer(
    interaction: HumanInteractionEntity,
    endReason: VoiceCallEndReasonEnum,
    durationSeconds?: number
  ): Promise<void> {
    try {
      const owner = await findAgentInboxOwner(this.environmentRepository, {
        environmentId: String(interaction._environmentId),
        organizationId: String(interaction._organizationId),
      });
      if (!owner) {
        return;
      }

      const turnCount = interaction._conversationId
        ? await this.settlement.countVoiceTurns(
            String(interaction._environmentId),
            String(interaction._organizationId),
            String(interaction._conversationId)
          )
        : undefined;

      trackAgentInboxCallEndedWithoutAnswer(this.analyticsService, owner, {
        agentId: String(interaction._agentId),
        interactionId: interaction.identifier,
        endReason,
        ...(durationSeconds !== undefined ? { durationSeconds } : {}),
        ...(turnCount !== undefined ? { turnCount } : {}),
      });
    } catch (err) {
      this.logger.warn({ err, interactionId: interaction.identifier }, 'Failed to track Call Ended Without Answer');
    }
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
      return (await this.abandonUnconfirmedIfDue(interaction)) ?? interaction;
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

  /**
   * A timed-out dial keeps a pending row and its minutes, with no call id for
   * the post-call webhook to close. After the longest a call can last, drop it.
   */
  private async abandonUnconfirmedIfDue(interaction: HumanInteractionEntity): Promise<HumanInteractionEntity | null> {
    const held = (interaction.voiceSubscriberIds?.length ?? 0) > 0 || (interaction.voiceMinutesReserved ?? 0) > 0;
    const hasVoiceDelivery = (interaction.deliveries ?? []).some(
      (delivery) => delivery.platform === HumanChannelViaEnum.VOICE
    );
    if (!held || hasVoiceDelivery) {
      return null;
    }

    const stamp = interaction.voiceMinutesReservedAt ?? interaction.createdAt;
    const reservedAt = Date.parse(stamp);
    if (!Number.isFinite(reservedAt)) {
      return null;
    }

    if (Date.now() - reservedAt < VOICE_CALL_MAX_MINUTES * 60 * 1000) {
      return null;
    }

    return this.settlement.abandonUnconfirmedVoiceHold(interaction);
  }
}
