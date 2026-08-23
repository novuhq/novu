import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionResponse, HumanInteractionStatusEnum } from '@novu/shared';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import { buildResolvedContent } from './human-card.builder';

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

    return expired;
  }

  /**
   * Fail-soft in-place edit of the delivered message to its resolved
   * rendering. Delivery problems must never undo a settlement — the DB row is
   * the source of truth the CLI is polling.
   */
  private async editDeliveredMessage(interaction: HumanInteractionEntity): Promise<void> {
    if (!interaction.platformMessageId || !interaction.platformThreadId) {
      return;
    }

    try {
      await this.outboundGateway.editInConversation(
        interaction._agentId,
        interaction.integrationIdentifier,
        interaction.platform,
        interaction.platformThreadId,
        interaction.platformMessageId,
        buildResolvedContent(interaction)
      );
    } catch (err) {
      this.logger.warn(
        {
          err,
          interactionIdentifier: interaction.identifier,
          platform: interaction.platform,
          platformMessageId: interaction.platformMessageId,
        },
        'Failed to edit delivered human-interaction message after settlement'
      );
    }
  }
}
