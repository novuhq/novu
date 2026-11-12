import { Injectable } from '@nestjs/common';
import { HumanInteractionKindEnum, HumanInteractionResponse, HumanInteractionStatusEnum } from '@novu/shared';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  HumanInteractionDBModel,
  HumanInteractionDelivery,
  HumanInteractionEntity,
  HumanInteractionHold,
} from './human-interaction.entity';
import { HumanInteraction } from './human-interaction.schema';

/** A send that claimed a hold and never finished (a crash) frees it after this long. */
const STALE_HOLD_CLAIM_MS = 15 * 60_000;

@Injectable()
export class HumanInteractionRepository extends BaseRepositoryV2<
  HumanInteractionDBModel,
  HumanInteractionEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(HumanInteraction, HumanInteractionEntity);
  }

  async findByIdentifier(environmentId: string, identifier: string): Promise<HumanInteractionEntity | null> {
    return this.findOne({ _environmentId: environmentId, identifier }, '*');
  }

  async findByRequestId(environmentId: string, requestId: string): Promise<HumanInteractionEntity | null> {
    return this.findOne({ _environmentId: environmentId, requestId }, '*');
  }

  async findPendingByRequestId(environmentId: string, requestId: string): Promise<HumanInteractionEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        requestId,
        status: HumanInteractionStatusEnum.PENDING,
      },
      '*'
    );
  }

  async countPendingForSubscriber(environmentId: string, subscriberId: string): Promise<number> {
    return this.count({
      _environmentId: environmentId,
      subscriberIds: subscriberId,
      status: HumanInteractionStatusEnum.PENDING,
    });
  }

  /**
   * Pending `ask` interactions for a human, newest first — powers the
   * bare-message correlation fallback and the disambiguation card.
   */
  async findPendingAsks(environmentId: string, subscriberId: string, limit = 10): Promise<HumanInteractionEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        subscriberIds: subscriberId,
        kind: HumanInteractionKindEnum.ASK,
        status: HumanInteractionStatusEnum.PENDING,
        // A question still held for them hasn't reached them, so their next words can't answer it.
        'held.subscriberId': { $ne: subscriberId },
      },
      '*',
      { sort: { createdAt: -1 }, limit }
    );
  }

  /**
   * Pending `ask` interactions in a conversation, newest first — conversation-
   * scoped bare-message correlation for framework `ctx.ask`.
   */
  async findPendingAsksByConversation(
    environmentId: string,
    conversationId: string,
    limit = 10
  ): Promise<HumanInteractionEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        _conversationId: conversationId,
        kind: HumanInteractionKindEnum.ASK,
        status: HumanInteractionStatusEnum.PENDING,
      },
      '*',
      { sort: { createdAt: -1 }, limit }
    );
  }

  /**
   * Exact reply-to correlation: the replied-to platform message is the
   * delivered card. Adapters store message ids in platform-specific shapes
   * (Telegram uses a `chatId:messageId` composite while the webhook's
   * `reply_to_message.message_id` is bare), so the caller passes every
   * candidate form.
   */
  async findPendingByPlatformMessageId(
    environmentId: string,
    platformMessageIds: string[]
  ): Promise<HumanInteractionEntity | null> {
    if (platformMessageIds.length === 0) {
      return null;
    }

    return this.findOne(
      {
        _environmentId: environmentId,
        status: HumanInteractionStatusEnum.PENDING,
        'deliveries.platformMessageId': { $in: platformMessageIds },
      },
      '*'
    );
  }

  /** The interactions behind the cards of an inbox thread, by their public identifiers. */
  async findByIdentifiers(
    environmentId: string,
    organizationId: string,
    identifiers: string[]
  ): Promise<HumanInteractionEntity[]> {
    if (identifiers.length === 0) {
      return [];
    }

    return this.find(
      { _environmentId: environmentId, _organizationId: organizationId, identifier: { $in: identifiers } },
      '*'
    );
  }

  /**
   * Questions still waiting on a person in any of the given conversations, oldest first. Expiry is
   * lazy, so an overdue row can still say pending; `nowIso` leaves those out.
   */
  async findPendingByConversations(
    environmentId: string,
    organizationId: string,
    conversationIds: string[],
    nowIso: string
  ): Promise<Pick<HumanInteractionEntity, 'subscriberIds' | 'anyoneMayAnswer' | '_conversationId'>[]> {
    if (conversationIds.length === 0) {
      return [];
    }

    return this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _conversationId: { $in: conversationIds },
        status: HumanInteractionStatusEnum.PENDING,
        kind: { $ne: HumanInteractionKindEnum.TELL },
        expiresAt: { $gte: nowIso },
      },
      ['subscriberIds', 'anyoneMayAnswer', '_conversationId'],
      { sort: { createdAt: 1 } }
    );
  }

  /** What is still held for someone on this WhatsApp integration and not yet expired, oldest first. */
  async findHeldFor(
    environmentId: string,
    organizationId: string,
    subscriberId: string,
    integrationIdentifier: string,
    nowIso: string,
    options: { limit?: number; excludeIds?: string[] } = {}
  ): Promise<HumanInteractionEntity[]> {
    return this.find(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        status: HumanInteractionStatusEnum.PENDING,
        expiresAt: { $gte: nowIso },
        held: { $elemMatch: { subscriberId, integrationIdentifier } },
        ...(options.excludeIds?.length ? { _id: { $nin: options.excludeIds } } : {}),
      },
      '*',
      { sort: { createdAt: 1 }, limit: options.limit ?? 20 }
    );
  }

  /** Records someone as held, after the first-message template went out to them. */
  async addHold(environmentId: string, id: string, hold: HumanInteractionHold): Promise<void> {
    await this.update({ _id: id, _environmentId: environmentId }, { $push: { held: hold } });
  }

  /**
   * Claims someone's hold on one WhatsApp integration before the held message is sent, so two replies at once send
   * it only once. The hold stays on the row while it is sent, so the row can't settle as delivered meanwhile; a
   * claim left by a send that never finished can be taken again after a while. Returns the hold, or null when it is
   * claimed already or the row stopped waiting.
   */
  async claimHold(
    environmentId: string,
    id: string,
    subscriberId: string,
    integrationIdentifier: string
  ): Promise<HumanInteractionHold | null> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_HOLD_CLAIM_MS).toISOString();
    const claimed = await this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        // Fresh checks, so one canceled, answered or expired since it was found is never sent.
        status: HumanInteractionStatusEnum.PENDING,
        expiresAt: { $gte: now.toISOString() },
        // Only the hold on the integration they wrote on: the held message goes back through that same number.
        held: {
          $elemMatch: {
            subscriberId,
            integrationIdentifier,
            $or: [{ claimedAt: { $exists: false } }, { claimedAt: { $lt: staleBefore } }],
          },
        },
      },
      { $set: { 'held.$.claimedAt': now.toISOString() } },
      { new: true }
    );

    return (
      claimed?.held?.find(
        (hold) => hold.subscriberId === subscriberId && hold.integrationIdentifier === integrationIdentifier
      ) ?? null
    );
  }

  /** The held message went out: its hold becomes a delivery, in one update. */
  async completeHold(
    environmentId: string,
    id: string,
    hold: Pick<HumanInteractionHold, 'subscriberId' | 'integrationIdentifier'>,
    delivery: HumanInteractionDelivery
  ): Promise<void> {
    await this.update(
      { _id: id, _environmentId: environmentId },
      {
        $pull: { held: { subscriberId: hold.subscriberId, integrationIdentifier: hold.integrationIdentifier } },
        $push: { deliveries: delivery },
      }
    );
  }

  /** The send failed: the hold is free again for their next message. */
  async releaseHoldClaim(
    environmentId: string,
    id: string,
    hold: Pick<HumanInteractionHold, 'subscriberId' | 'integrationIdentifier'>
  ): Promise<void> {
    await this.update(
      {
        _id: id,
        _environmentId: environmentId,
        held: { $elemMatch: { subscriberId: hold.subscriberId, integrationIdentifier: hold.integrationIdentifier } },
      },
      { $unset: { 'held.$.claimedAt': '' } }
    );
  }

  /**
   * Settles a plain message as delivered once nobody is still waiting for it, decided by the row itself, so two
   * releases at once can't both leave it pending.
   */
  async markTellDeliveredWhenReleased(environmentId: string, id: string): Promise<void> {
    await this.update(
      {
        _id: id,
        _environmentId: environmentId,
        kind: HumanInteractionKindEnum.TELL,
        status: HumanInteractionStatusEnum.PENDING,
        'held.0': { $exists: false },
      },
      { $set: { status: HumanInteractionStatusEnum.DELIVERED } }
    );
  }

  async stampDelivery(
    environmentId: string,
    id: string,
    delivery: {
      deliveries: HumanInteractionDelivery[];
      _conversationId?: string;
      subscriberIds?: string[];
    }
  ): Promise<void> {
    const $set: Record<string, unknown> = {};
    if (delivery._conversationId) $set._conversationId = delivery._conversationId;
    if (delivery.subscriberIds) $set.subscriberIds = delivery.subscriberIds;

    // Appended, never replaced: a held message released while the send was still going adds its own delivery.
    await this.update(
      { _id: id, _environmentId: environmentId },
      {
        ...(Object.keys($set).length ? { $set } : {}),
        ...(delivery.deliveries.length ? { $push: { deliveries: { $each: delivery.deliveries } } } : {}),
      }
    );
  }

  /**
   * Atomically settles a pending interaction. The `status: PENDING` filter is
   * the concurrency guard — a button click and a lazy expiry can race, and
   * exactly one wins. Returns the settled row, or null if it was no longer
   * pending.
   */
  async settleIfPending(
    environmentId: string,
    id: string,
    status: HumanInteractionStatusEnum,
    response?: HumanInteractionResponse
  ): Promise<HumanInteractionEntity | null> {
    return this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        status: HumanInteractionStatusEnum.PENDING,
        expiresAt: { $gte: new Date().toISOString() },
      },
      { $set: { status, ...(response ? { response } : {}) } },
      { new: true }
    );
  }

  async markDeliveredIfPending(environmentId: string, id: string): Promise<HumanInteractionEntity | null> {
    return this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        status: HumanInteractionStatusEnum.PENDING,
      },
      { $set: { status: HumanInteractionStatusEnum.DELIVERED } },
      { new: true }
    );
  }

  /**
   * Lazy expiry: flips a pending, overdue interaction to `expired`. Returns
   * the expired row (for firing the card edit) or null when nothing changed.
   */
  async expireIfOverdue(environmentId: string, id: string, nowIso: string): Promise<HumanInteractionEntity | null> {
    return this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        status: HumanInteractionStatusEnum.PENDING,
        expiresAt: { $lt: nowIso },
      },
      { $set: { status: HumanInteractionStatusEnum.EXPIRED } },
      { new: true }
    );
  }

  /** Notes when the agent first read a person's answer; a later read keeps that time. */
  async markAnswerRead(environmentId: string, id: string, readAt: string): Promise<void> {
    await this.update(
      {
        _id: id,
        _environmentId: environmentId,
        status: {
          $in: [
            HumanInteractionStatusEnum.APPROVED,
            HumanInteractionStatusEnum.DENIED,
            HumanInteractionStatusEnum.ANSWERED,
          ],
        },
        answerReadAt: { $exists: false },
      },
      { $set: { answerReadAt: readAt } }
    );
  }

  async listInteractions(params: {
    environmentId: string;
    organizationId: string;
    subscriberId?: string;
    status?: HumanInteractionStatusEnum;
    limit?: number;
    before?: string;
  }): Promise<HumanInteractionEntity[]> {
    return this.find(
      {
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        ...(params.subscriberId ? { subscriberIds: params.subscriberId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.before ? { _id: { $lt: params.before } } : {}),
      },
      '*',
      { sort: { _id: -1 }, limit: Math.min(params.limit ?? 20, 100) }
    );
  }
}
