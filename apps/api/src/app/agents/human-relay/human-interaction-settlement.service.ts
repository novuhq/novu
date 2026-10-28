import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationEntity, HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import {
  HumanChannelViaEnum,
  HumanInteractionKindEnum,
  HumanInteractionResponse,
  HumanInteractionStatusEnum,
  parseToolApprovalRequestId,
  type VoiceCallFailure,
} from '@novu/shared';
import { HumanVoiceMinuteQuotaService } from '../../human/services/human-voice-minute-quota.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { ResumeManagedHuman } from '../managed-runtime/novu-human/resume-managed-human.usecase';
import { editDeliveredHumanCards } from './edit-delivered-card';
import { buildResolvedContent } from './human-card.builder';
import { HumanInteractionActivityRecorder } from './human-interaction-activity.recorder';
import { ResumeToolApprovalFromHitl } from './resume-tool-approval-from-hitl.usecase';

/**
 * Owns the terminal transition of a human interaction: the atomic
 * pending→terminal flip (a button click and a lazy expiry can race — exactly
 * one wins) followed by the in-place edit of the delivered message so stale
 * buttons never stay live. Shared by the HumanModule usecases (cancel, lazy
 * expiry on reads) and the HumanRelayRuntime (clicks, replies).
 */
@Injectable()
export class HumanInteractionSettlementService {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly outboundGateway: OutboundGateway,
    @Inject(forwardRef(() => ResumeManagedHuman))
    private readonly resumeManagedHuman: ResumeManagedHuman,
    private readonly resumeToolApprovalFromHitl: ResumeToolApprovalFromHitl,
    private readonly logger: PinoLogger,
    private readonly activityRecorder: HumanInteractionActivityRecorder,
    private readonly voiceMinuteQuota: HumanVoiceMinuteQuotaService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * `answeredIn` is the conversation of the message or button press that settles it, when a person did:
   * the answer is recorded in that thread, which matters when one question went to several contacts.
   */
  async settle(
    interaction: HumanInteractionEntity,
    status: HumanInteractionStatusEnum,
    response?: HumanInteractionResponse,
    answeredIn?: ConversationEntity
  ): Promise<HumanInteractionEntity | null> {
    const settled = await this.humanInteractionRepository.settleIfPending(
      interaction._environmentId,
      interaction._id,
      status,
      response
    );

    if (settled) {
      await this.releaseVoiceReservation(settled);
      await this.editDeliveredMessage(settled);
      await this.resumeAfterSettlement(settled, answeredIn);
    } else {
      await this.expireIfOverdue(interaction);
    }

    return settled;
  }

  /**
   * Records a commitment the agent heard on a voice call that already expired
   * because the person hung up. Pending rows still go through `settle`.
   */
  async settleExpiredVoice(
    interaction: HumanInteractionEntity,
    status: HumanInteractionStatusEnum,
    response?: HumanInteractionResponse
  ): Promise<HumanInteractionEntity | null> {
    const settled = await this.humanInteractionRepository.settleIfExpired(
      interaction._environmentId,
      interaction._id,
      status,
      response
    );
    if (!settled) {
      return null;
    }

    await this.releaseVoiceReservation(settled);
    await this.editDeliveredMessage(settled);
    await this.resumeAfterSettlement(settled);

    return settled;
  }

  /**
   * One recipient's call never connected. The interaction fails only when nobody
   * else can still answer. Minutes for a partial failure stay on the row until
   * that later settlement, which returns them once.
   */
  async failVoiceCall(
    interaction: HumanInteractionEntity,
    voiceFailure: VoiceCallFailure,
    conversationId: string
  ): Promise<HumanInteractionEntity | null> {
    const delivery = (interaction.deliveries ?? []).find((item) => item.platformMessageId === conversationId);
    if (!delivery) {
      return null;
    }

    const statuses = openVoiceFailureStatuses(interaction);
    const marked = await this.humanInteractionRepository.markVoiceDeliveryFailed(
      interaction._environmentId,
      interaction._id,
      conversationId,
      delivery.subscriberId,
      voiceFailure,
      statuses
    );

    if (marked) {
      return this.closeVoiceFailure(marked, voiceFailure, statuses);
    }

    return this.retryVoiceFailure(interaction, conversationId);
  }

  /**
   * After every recipient has been dialed, close a call that no longer has
   * anyone who can answer. In-flight webhooks leave the row open while later
   * recipients are still being placed.
   */
  async closeVoiceCallIfUnanswerable(interaction: HumanInteractionEntity): Promise<HumanInteractionEntity | null> {
    const current =
      (await this.humanInteractionRepository.findByIdentifier(interaction._environmentId, interaction.identifier)) ??
      interaction;
    const statuses = openVoiceFailureStatuses(current);

    if (!statuses.includes(current.status)) {
      return current.status === HumanInteractionStatusEnum.FAILED ? current : null;
    }

    if (voiceCallCanStillBeAnswered(current, true)) {
      return null;
    }

    const voiceFailure = current.deliveries?.find((delivery) => delivery.voiceFailure)?.voiceFailure;
    if (!voiceFailure) {
      return null;
    }

    return this.finishFailedVoiceCall(current, voiceFailure, statuses);
  }

  /**
   * Lazy expiry — every read path calls this so an overdue interaction flips
   * to `expired` (and its card is disabled) the moment anyone looks at it.
   * Returns the up-to-date row.
   */
  async expireIfOverdue(interaction: HumanInteractionEntity): Promise<HumanInteractionEntity> {
    if (interaction.status !== HumanInteractionStatusEnum.PENDING) {
      return interaction;
    }

    const nowIso = new Date().toISOString();
    if (interaction.expiresAt >= nowIso) {
      return interaction;
    }

    const expired = await this.humanInteractionRepository.expireIfOverdue(
      interaction._environmentId,
      interaction._id,
      nowIso
    );

    if (!expired) {
      // Lost the race to a settle — reload for the caller.
      return (
        (await this.humanInteractionRepository.findByIdentifier(interaction._environmentId, interaction.identifier)) ??
        interaction
      );
    }

    await this.releaseVoiceReservation(expired);
    await this.editDeliveredMessage(expired);
    await this.resumeAfterSettlement(expired);

    return expired;
  }

  /**
   * Fail-soft in-place edit of the delivered message to its resolved
   * rendering. Delivery problems must never undo a settlement — the DB row is
   * the source of truth the CLI is polling.
   *
   * Tool-approval cards are skipped here: their card lifecycle is owned by
   * `ResumeToolApprovalFromHitl` (managed agents delete the card, self-hosted
   * agents edit it in place), so editing here too would double-write and race
   * the managed delete.
   */
  private async finishFailedVoiceCall(
    interaction: HumanInteractionEntity,
    voiceFailure: VoiceCallFailure,
    statuses: HumanInteractionStatusEnum[]
  ): Promise<HumanInteractionEntity | null> {
    const failed = await this.humanInteractionRepository.failVoiceIfOpen(
      interaction._environmentId,
      interaction._id,
      voiceFailure,
      statuses
    );

    if (!failed) {
      return null;
    }

    await this.releaseVoiceReservation(failed);
    const voiceOnly = (failed.deliveries ?? []).every((delivery) => delivery.platform === HumanChannelViaEnum.VOICE);
    if (!voiceOnly) {
      await this.editDeliveredMessage(failed);
    }

    await this.resumeAfterSettlement(failed);

    return failed;
  }

  /**
   * One saved minute is returned once. The create request can release the same
   * hold, so this takes whatever is still stored instead of trusting a stale read.
   */
  private async releaseVoiceReservation(interaction: HumanInteractionEntity): Promise<void> {
    if (!interaction.voiceMinutesReserved || interaction.voiceMinutesReserved <= 0) {
      return;
    }

    const claimed = await this.humanInteractionRepository.takeVoiceMinutes(interaction._environmentId, interaction._id);
    if (!claimed) {
      return;
    }

    const reservedAt = claimed.reservedAt ? new Date(claimed.reservedAt) : new Date(interaction.createdAt);

    await this.voiceMinuteQuota.releaseReserved(String(interaction._organizationId), claimed.minutes, reservedAt);
  }

  private async closeVoiceFailure(
    interaction: HumanInteractionEntity,
    voiceFailure: VoiceCallFailure,
    statuses: HumanInteractionStatusEnum[]
  ): Promise<HumanInteractionEntity | null> {
    if (voiceCallCanStillBeAnswered(interaction, false)) {
      return interaction;
    }

    return this.finishFailedVoiceCall(interaction, voiceFailure, statuses);
  }

  /** A retry already stored the failure. Finish closing the interaction when the first attempt stopped short. */
  private async retryVoiceFailure(
    interaction: HumanInteractionEntity,
    conversationId: string
  ): Promise<HumanInteractionEntity | null> {
    const current = await this.humanInteractionRepository.findByIdentifier(
      interaction._environmentId,
      interaction.identifier
    );
    if (!current) {
      return null;
    }

    const statuses = openVoiceFailureStatuses(current);
    if (!statuses.includes(current.status)) {
      return current.status === HumanInteractionStatusEnum.FAILED ? current : null;
    }

    const failedDelivery = (current.deliveries ?? []).find((item) => {
      return item.platformMessageId === conversationId && item.voiceFailure;
    });
    if (!failedDelivery?.voiceFailure) {
      return null;
    }

    return this.closeVoiceFailure(current, failedDelivery.voiceFailure, statuses);
  }

  private async editDeliveredMessage(interaction: HumanInteractionEntity): Promise<void> {
    if (parseToolApprovalRequestId(interaction.requestId) !== null) {
      return;
    }

    await editDeliveredHumanCards(this.outboundGateway, this.logger, interaction, buildResolvedContent(interaction));
  }

  private async resumeAfterSettlement(
    interaction: HumanInteractionEntity,
    answeredIn?: ConversationEntity
  ): Promise<void> {
    await this.activityRecorder.recordResponse(interaction, answeredIn);
    await this.resumeManagedHuman.execute(interaction);
    await this.resumeToolApprovalFromHitl.execute(interaction);
  }
}

function openVoiceFailureStatuses(interaction: Pick<HumanInteractionEntity, 'kind'>): HumanInteractionStatusEnum[] {
  if (interaction.kind === HumanInteractionKindEnum.TELL) {
    return [HumanInteractionStatusEnum.PENDING, HumanInteractionStatusEnum.DELIVERED];
  }

  return [HumanInteractionStatusEnum.PENDING];
}

/**
 * A non-voice delivery can still be answered. A voice delivery can, until it
 * has a failure or the connected call has ended. While the fan-out is still
 * dialing, a contact with no delivery yet is not a reason to close the row.
 */
export function voiceCallCanStillBeAnswered(interaction: HumanInteractionEntity, fanOutComplete: boolean): boolean {
  const deliveries = interaction.deliveries ?? [];

  if (!fanOutComplete) {
    const stillDialing = (interaction.voiceSubscriberIds ?? []).some(
      (subscriberId) =>
        !deliveries.some(
          (delivery) => delivery.subscriberId === subscriberId && delivery.platform === HumanChannelViaEnum.VOICE
        )
    );

    if (stillDialing) {
      return true;
    }
  }

  return deliveries.some(
    (delivery) =>
      delivery.platform !== HumanChannelViaEnum.VOICE || (!delivery.voiceFailure && !delivery.voiceCallEnded)
  );
}
