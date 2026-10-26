import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { ConversationEntity, HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import {
  HumanChannelViaEnum,
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
   * The call never connected. Releases the minute hold and the one-live-call
   * lock. There is no chat card to edit: the delivery is the phone call itself.
   */
  async failVoiceCall(
    interaction: HumanInteractionEntity,
    voiceFailure: VoiceCallFailure
  ): Promise<HumanInteractionEntity | null> {
    const failed = await this.humanInteractionRepository.failVoiceIfPending(
      interaction._environmentId,
      interaction._id,
      voiceFailure
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
  /** Exactly one of settle or expiry wins the pending flip, so the minutes are returned once. */
  private async releaseVoiceReservation(interaction: HumanInteractionEntity): Promise<void> {
    const minutes = interaction.voiceMinutesReserved;
    if (!minutes || minutes <= 0) {
      return;
    }

    const reservedAt = interaction.voiceMinutesReservedAt
      ? new Date(interaction.voiceMinutesReservedAt)
      : new Date(interaction.createdAt);

    await this.voiceMinuteQuota.releaseReserved(String(interaction._organizationId), minutes, reservedAt);
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
