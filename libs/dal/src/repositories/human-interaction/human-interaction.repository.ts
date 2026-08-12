import { Injectable } from '@nestjs/common';
import {
  HumanInteractionKindEnum,
  HumanInteractionResponse,
  HumanInteractionStatusEnum,
} from '@novu/shared';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { HumanInteractionDBModel, HumanInteractionEntity } from './human-interaction.entity';
import { HumanInteraction } from './human-interaction.schema';

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

  async countPendingForSubscriber(environmentId: string, subscriberId: string): Promise<number> {
    return this.count({
      _environmentId: environmentId,
      subscriberId,
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
        subscriberId,
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
        platformMessageId: { $in: platformMessageIds },
        status: HumanInteractionStatusEnum.PENDING,
      },
      '*'
    );
  }

  async stampDelivery(
    environmentId: string,
    id: string,
    delivery: { platformMessageId?: string; platformThreadId?: string; _conversationId?: string }
  ): Promise<void> {
    const $set: Record<string, string> = {};
    if (delivery.platformMessageId) $set.platformMessageId = delivery.platformMessageId;
    if (delivery.platformThreadId) $set.platformThreadId = delivery.platformThreadId;
    if (delivery._conversationId) $set._conversationId = delivery._conversationId;

    if (Object.keys($set).length === 0) return;

    await this.update({ _id: id, _environmentId: environmentId }, { $set });
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
      },
      { $set: { status, ...(response ? { response } : {}) } },
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
        ...(params.subscriberId ? { subscriberId: params.subscriberId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.before ? { _id: { $lt: params.before } } : {}),
      },
      '*',
      { sort: { _id: -1 }, limit: Math.min(params.limit ?? 20, 100) }
    );
  }
}
