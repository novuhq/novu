import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionResponse, HumanInteractionStatusEnum, parseToolApprovalRequestId } from '@novu/shared';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { ResumeManagedHuman } from '../managed-runtime/novu-human/resume-managed-human.usecase';
import { editDeliveredHumanCards } from './edit-delivered-card';
import { buildResolvedContent } from './human-card.builder';
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
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async settle(
    interaction: HumanInteractionEntity,
    status: HumanInteractionStatusEnum,
    response?: HumanInteractionResponse
  ): Promise<HumanInteractionEntity | null> {
    const settled = await this.humanInteractionRepository.settleIfPending(
      interaction._environmentId,
      interaction._id,
      status,
      response
    );

    if (settled) {
      await this.editDeliveredMessage(settled);
      await this.resumeAfterSettlement(settled);
    } else {
      await this.expireIfOverdue(interaction);
    }

    return settled;
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
  private async editDeliveredMessage(interaction: HumanInteractionEntity): Promise<void> {
    if (parseToolApprovalRequestId(interaction.requestId) !== null) {
      return;
    }

    await editDeliveredHumanCards(this.outboundGateway, this.logger, interaction, buildResolvedContent(interaction));
  }

  private async resumeAfterSettlement(interaction: HumanInteractionEntity): Promise<void> {
    await this.resumeManagedHuman.execute(interaction);
    await this.resumeToolApprovalFromHitl.execute(interaction);
  }
}
