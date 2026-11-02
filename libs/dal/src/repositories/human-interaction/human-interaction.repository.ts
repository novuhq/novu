import { Injectable } from '@nestjs/common';
import {
  HumanChannelViaEnum,
  HumanInteractionKindEnum,
  HumanInteractionResponse,
  HumanInteractionStatusEnum,
  VoiceCallFailure,
} from '@novu/shared';
import { Types } from 'mongoose';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import {
  HumanInteractionDBModel,
  HumanInteractionDelivery,
  HumanInteractionEntity,
  VoiceCallEnded,
} from './human-interaction.entity';
import { HumanInteraction } from './human-interaction.schema';

/**
 * Copies `voiceFailure` and `voiceCallEnded` from the stored delivery onto the
 * stamp that shares its conversation id. A webhook can land while the next
 * recipient is still being dialed, and replacing the array from memory would drop it.
 */
function deliveriesKeepingStoredFailures(deliveries: HumanInteractionDelivery[]): Record<string, unknown> {
  return {
    $map: {
      input: { $literal: deliveries },
      as: 'next',
      in: {
        $let: {
          vars: {
            previous: {
              $first: {
                $filter: {
                  input: { $ifNull: ['$deliveries', []] },
                  as: 'prev',
                  cond: { $eq: ['$$prev.platformMessageId', '$$next.platformMessageId'] },
                },
              },
            },
          },
          in: {
            $mergeObjects: [
              '$$next',
              {
                $cond: [{ $ne: ['$$previous.voiceFailure', null] }, { voiceFailure: '$$previous.voiceFailure' }, {}],
              },
              {
                $cond: [
                  { $ne: ['$$previous.voiceCallEnded', null] },
                  { voiceCallEnded: '$$previous.voiceCallEnded' },
                  {},
                ],
              },
            ],
          },
        },
      },
    },
  };
}

/**
 * A contact is on a call only when their own delivery is voice, or they are
 * listed before that stamp lands. Another recipient on the same row is not.
 */
function pendingVoiceFilter(environmentId: string, subscriberIds: string[]) {
  const subscriberMatch = subscriberIds.length === 1 ? subscriberIds[0] : { $in: subscriberIds };

  return {
    _environmentId: environmentId,
    subscriberIds: subscriberMatch,
    status: HumanInteractionStatusEnum.PENDING,
    $or: [
      {
        deliveries: {
          $elemMatch: {
            platform: HumanChannelViaEnum.VOICE,
            subscriberId: subscriberMatch,
            voiceFailure: { $exists: false },
            voiceCallEnded: { $exists: false },
          },
        },
      },
      { voiceSubscriberIds: subscriberMatch },
    ],
  };
}

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

  /** A live call is this contact's pending voice delivery, including one whose stamp has not landed yet. */
  async countPendingVoiceForSubscriber(environmentId: string, subscriberId: string): Promise<number> {
    return this.count(pendingVoiceFilter(environmentId, [subscriberId]));
  }

  /** Pending voice rows for these contacts, so a send can expire them before treating them as busy. */
  async findPendingVoiceForSubscribers(
    environmentId: string,
    subscriberIds: string[]
  ): Promise<HumanInteractionEntity[]> {
    if (subscriberIds.length === 0) {
      return [];
    }

    return this.find(pendingVoiceFilter(environmentId, subscriberIds), '*');
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

  /** Any status. A voice failure can arrive after a tell has already been marked delivered. */
  async findByPlatformMessageId(
    environmentId: string,
    platformMessageIds: string[]
  ): Promise<HumanInteractionEntity | null> {
    if (platformMessageIds.length === 0) {
      return null;
    }

    return this.findOne(
      {
        _environmentId: environmentId,
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

  async stampDelivery(
    environmentId: string,
    id: string,
    delivery: {
      deliveries: HumanInteractionDelivery[];
      _conversationId?: string;
      subscriberIds?: string[];
    }
  ): Promise<void> {
    // A webhook can mark a call while the next recipient is still being dialed.
    // Replacing the array from memory would drop that voiceFailure or voiceCallEnded.
    const $set: Record<string, unknown> = {
      deliveries: deliveriesKeepingStoredFailures(delivery.deliveries),
    };
    // Pipeline updates skip Mongoose casts. This field is stored as an ObjectId.
    if (delivery._conversationId) $set._conversationId = new Types.ObjectId(delivery._conversationId);
    // A contact id can start with `$`. In a pipeline update that is a field path.
    if (delivery.subscriberIds) $set.subscriberIds = { $literal: delivery.subscriberIds };

    await this.update({ _id: id, _environmentId: environmentId }, [{ $set }] as never);
  }

  /**
   * Narrows the saved voice hold to the contacts a send actually reached.
   *
   * `expectedMinutes` is the compare-and-swap guard: a failure webhook running
   * `takeVoiceMinutes` concurrently has already given those minutes back, and an
   * unguarded write here would put them back on the row for settlement to give
   * back a second time. Pass the minutes the caller believes are stored (0 when
   * it believes none are) and treat `false` as "another path owns this hold now".
   *
   * The recipient list narrows in the same write, because a send that keeps only
   * some callers holds minutes for exactly those callers.
   */
  async narrowVoiceHold(
    environmentId: string,
    id: string,
    params: {
      expectedMinutes: number;
      minutes: number;
      voiceSubscriberIds: string[];
      subscriberIds?: string[];
    }
  ): Promise<boolean> {
    const $set: {
      voiceMinutesReserved?: number;
      voiceSubscriberIds?: string[];
      subscriberIds?: string[];
    } = {};
    const $unset: { voiceMinutesReserved?: 1; voiceMinutesReservedAt?: 1; voiceSubscriberIds?: 1 } = {};

    if (params.minutes > 0) {
      $set.voiceMinutesReserved = params.minutes;
    } else {
      $unset.voiceMinutesReserved = 1;
      $unset.voiceMinutesReservedAt = 1;
    }

    if (params.voiceSubscriberIds.length > 0) {
      $set.voiceSubscriberIds = params.voiceSubscriberIds;
    } else {
      $unset.voiceSubscriberIds = 1;
    }

    if (params.subscriberIds) {
      $set.subscriberIds = params.subscriberIds;
    }

    const previous = await this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        // A hold of 0 is an absent field, not a stored zero.
        voiceMinutesReserved: params.expectedMinutes > 0 ? params.expectedMinutes : null,
      },
      {
        ...(Object.keys($set).length > 0 ? { $set } : {}),
        ...(Object.keys($unset).length > 0 ? { $unset } : {}),
      },
      { new: false }
    );

    return previous !== null;
  }

  /** Clears the saved hold and returns the minutes that were still stored. A second caller gets nothing. */
  async takeVoiceMinutes(environmentId: string, id: string): Promise<{ minutes: number; reservedAt?: string } | null> {
    const previous = await this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        voiceMinutesReserved: { $gt: 0 },
      },
      {
        $unset: {
          voiceMinutesReserved: 1,
          voiceMinutesReservedAt: 1,
          voiceSubscriberIds: 1,
        },
      },
      { new: false }
    );

    if (!previous?.voiceMinutesReserved || previous.voiceMinutesReserved <= 0) {
      return null;
    }

    return {
      minutes: previous.voiceMinutesReserved,
      reservedAt: previous.voiceMinutesReservedAt,
    };
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

  /**
   * A connected voice call can expire when the person hangs up before the agent
   * records the commitment it already heard. Only a call that actually ended,
   * and only while the request is still inside its TTL. A text row, a failed
   * dial, or a request whose deadline passed cannot be rewritten from here.
   */
  async settleIfExpired(
    environmentId: string,
    id: string,
    status: HumanInteractionStatusEnum,
    response?: HumanInteractionResponse
  ): Promise<HumanInteractionEntity | null> {
    return this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        status: HumanInteractionStatusEnum.EXPIRED,
        expiresAt: { $gte: new Date().toISOString() },
        deliveries: {
          $elemMatch: {
            platform: HumanChannelViaEnum.VOICE,
            voiceCallEnded: { $exists: true },
          },
        },
      },
      { $set: { status, ...(response ? { response } : {}) } },
      { new: true }
    );
  }

  /**
   * One recipient's call never connected. A second webhook for that conversation
   * does not match. The row stays open when someone else can still answer.
   */
  async markVoiceDeliveryFailed(
    environmentId: string,
    id: string,
    platformMessageId: string,
    subscriberId: string,
    voiceFailure: VoiceCallFailure,
    statuses: HumanInteractionStatusEnum[]
  ): Promise<HumanInteractionEntity | null> {
    if (statuses.length === 0) {
      return null;
    }

    return this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        status: { $in: statuses },
        deliveries: {
          $elemMatch: {
            platformMessageId,
            voiceFailure: { $exists: false },
          },
        },
      },
      {
        $set: { 'deliveries.$[failed].voiceFailure': voiceFailure },
        $pull: { voiceSubscriberIds: subscriberId },
      },
      {
        new: true,
        arrayFilters: [{ 'failed.platformMessageId': platformMessageId, 'failed.voiceFailure': { $exists: false } }],
      }
    );
  }

  /**
   * A connected call ended. Settlement often lands first and must keep its
   * answer; this still records duration and why the call ended. Releases the
   * live-call lock for this recipient without marking the dial as a failure.
   */
  async markVoiceDeliveryEnded(
    environmentId: string,
    id: string,
    platformMessageId: string,
    subscriberId: string,
    voiceCallEnded: VoiceCallEnded
  ): Promise<HumanInteractionEntity | null> {
    return this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        deliveries: {
          $elemMatch: {
            platformMessageId,
            voiceFailure: { $exists: false },
            voiceCallEnded: { $exists: false },
          },
        },
      },
      {
        $set: { 'deliveries.$[ended].voiceCallEnded': voiceCallEnded },
        $pull: { voiceSubscriberIds: subscriberId },
      },
      {
        new: true,
        arrayFilters: [
          {
            'ended.platformMessageId': platformMessageId,
            'ended.voiceFailure': { $exists: false },
            'ended.voiceCallEnded': { $exists: false },
          },
        ],
      }
    );
  }

  /**
   * The interaction itself failed. Pending is the usual guard. A voice tell is
   * already `delivered` once the dial is accepted, and can still fail here.
   */
  async failVoiceIfOpen(
    environmentId: string,
    id: string,
    voiceFailure: VoiceCallFailure,
    statuses: HumanInteractionStatusEnum[]
  ): Promise<HumanInteractionEntity | null> {
    if (statuses.length === 0) {
      return null;
    }

    return this.findOneAndUpdate(
      {
        _id: id,
        _environmentId: environmentId,
        status: { $in: statuses },
      },
      { $set: { status: HumanInteractionStatusEnum.FAILED, voiceFailure } },
      { new: true }
    );
  }

  async failVoiceIfPending(
    environmentId: string,
    id: string,
    voiceFailure: VoiceCallFailure
  ): Promise<HumanInteractionEntity | null> {
    return this.failVoiceIfOpen(environmentId, id, voiceFailure, [HumanInteractionStatusEnum.PENDING]);
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
