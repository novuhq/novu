import { Injectable } from '@nestjs/common';
import { CacheService } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanChannelViaEnum, HumanInteractionStatusEnum, VOICE_CALL_MAX_MINUTES } from '@novu/shared';
import { isUnconfirmedVoiceDial } from '../../agents/channels/voice/voice-call-failure';
import { HumanInteractionSettlementService } from '../../agents/human-relay/human-interaction-settlement.service';
import { RecordVoiceCallEnded } from '../usecases/record-voice-call-ended/record-voice-call-ended.usecase';
import {
  acquireVoiceLiveLocks,
  assertNoLiveVoiceCall,
  type PendingHumanInteractionInput,
} from './human-interaction-lifecycle';
import { type HumanVoiceMinuteCredits, HumanVoiceMinuteQuotaService } from './human-voice-minute-quota.service';

export type VoiceHoldScope = { environmentId: string; organizationId: string };

type VoiceHoldFields = Pick<
  PendingHumanInteractionInput,
  'voiceMinutesReserved' | 'voiceMinutesReservedAt' | 'voiceSubscriberIds'
>;

/**
 * The minutes one voice send holds, on both sides at once: the org-wide counters
 * in Redis and the `voiceMinutesReserved` / `voiceMinutesReservedAt` /
 * `voiceSubscriberIds` copy on the interaction.
 *
 * A dial, a failure webhook and a settle can all land on the same row, so every
 * write here is conditioned on the minutes the caller last saw. Nothing outside
 * this file writes those three fields.
 */
export interface VoiceMinuteHold {
  /** Stamped onto the row in the same insert that creates it, so the hold is never orphaned. */
  fields(): VoiceHoldFields;
  /** Releases the per-contact live-call locks once the row exists to hold the call. */
  releaseLocks(): Promise<void>;
  /** Keeps the minutes of the contacts the send reached, and gives the rest back. */
  keepReached(
    created: HumanInteractionEntity,
    delivered: HumanInteractionEntity,
    unconfirmedSubscriberIds: string[]
  ): Promise<void>;
  /** The send threw. Keeps a hold that may still be ringing, drops one that never left. */
  abandon(created: HumanInteractionEntity | undefined, err: unknown): Promise<void>;
  /** Returns whatever was never accepted. Idempotent, and safe to call twice. */
  release(): Promise<void>;
}

/** A send with no voice target, so the caller needs no branch of its own. */
export const NO_VOICE_HOLD: VoiceMinuteHold = {
  fields: () => ({}),
  releaseLocks: async () => undefined,
  keepReached: async () => undefined,
  abandon: async () => undefined,
  release: async () => undefined,
};

@Injectable()
export class HumanVoiceMinuteHoldService {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly voiceMinuteQuota: HumanVoiceMinuteQuotaService,
    private readonly cacheService: CacheService,
    private readonly settlement: HumanInteractionSettlementService,
    private readonly recordVoiceCallEnded: RecordVoiceCallEnded
  ) {}

  /**
   * Reserves the maximum a call can run for each contact, and takes their
   * live-call locks.
   */
  async open(scope: VoiceHoldScope, subscriberIds: string[]): Promise<VoiceMinuteHold> {
    if (subscriberIds.length === 0) {
      return NO_VOICE_HOLD;
    }

    await this.releaseStaleHolds(scope.environmentId, subscriberIds);
    const releaseLocks = await acquireVoiceLiveLocks(this.cacheService, scope.environmentId, subscriberIds);

    try {
      await assertNoLiveVoiceCall(this.humanInteractionRepository, {
        environmentId: scope.environmentId,
        subscriberIds,
      });
      const minutes = subscriberIds.length * VOICE_CALL_MAX_MINUTES;
      const credits = await this.voiceMinuteQuota.reserveMinutes(scope.organizationId, minutes);

      return this.hold(credits, minutes, subscriberIds, releaseLocks);
    } catch (err) {
      await releaseLocks();

      throw err;
    }
  }

  private hold(
    credits: HumanVoiceMinuteCredits,
    minutes: number,
    subscriberIds: string[],
    releaseLocks: () => Promise<void>
  ): VoiceMinuteHold {
    const holdsMinutes = !credits.unlimited;
    // Once the hold matches what the send reached, the row owns it and settlement
    // gives it back. A later failure must not clear it out from under a live call.
    let reconciled = false;

    return {
      fields: () => ({
        voiceSubscriberIds: subscriberIds,
        ...(holdsMinutes
          ? { voiceMinutesReserved: minutes, voiceMinutesReservedAt: credits.reservedAt.toISOString() }
          : {}),
      }),

      releaseLocks,

      keepReached: async (created, delivered, unconfirmedSubscriberIds) => {
        reconciled = true;
        const current =
          (await this.humanInteractionRepository.findByIdentifier(created._environmentId, created.identifier)) ??
          delivered;

        // A failure webhook already took and gave back these minutes. Accepting
        // them keeps `release` from giving the same minutes back again.
        if (current.status === HumanInteractionStatusEnum.FAILED) {
          credits.accept(created.voiceMinutesReserved ?? 0);

          return;
        }

        const reached =
          current.status === HumanInteractionStatusEnum.PENDING
            ? reachedVoiceSubscriberIds(current, delivered, unconfirmedSubscriberIds)
            : [];
        const keptMinutes = holdsMinutes ? reached.length * VOICE_CALL_MAX_MINUTES : 0;
        const storedMinutes = current.voiceMinutesReserved ?? 0;

        const claimed = await this.humanInteractionRepository.narrowVoiceHold(created._environmentId, created._id, {
          expectedMinutes: storedMinutes,
          minutes: keptMinutes,
          voiceSubscriberIds: reached,
        });

        // Declined means another path owns the hold now; its stored amount stands.
        credits.accept(claimed ? keptMinutes : (created.voiceMinutesReserved ?? storedMinutes));
      },

      abandon: async (created, err) => {
        if (!created || reconciled) {
          return;
        }

        if (isUnconfirmedVoiceDial(err)) {
          // A failed reload must not give back a call that may still be ringing.
          const stored = await this.storedMinutes(created).catch(() => undefined);
          credits.accept(stored);
          reconciled = true;

          return;
        }

        // The Redis hold is returned by `release`. Drop the row's copy so
        // settlement cannot give the same minutes back a second time.
        await this.humanInteractionRepository
          .narrowVoiceHold(created._environmentId, created._id, {
            expectedMinutes: created.voiceMinutesReserved ?? 0,
            minutes: 0,
            voiceSubscriberIds: [],
          })
          .catch(() => undefined);
      },

      release: () => credits.release(),
    };
  }

  /**
   * An overdue or abandoned voice request is not a live call. Release it before
   * the next send is judged, including when the post-call webhook never arrived.
   */
  private async releaseStaleHolds(environmentId: string, subscriberIds: string[]): Promise<void> {
    const pending = await this.humanInteractionRepository.findPendingVoiceForSubscribers(environmentId, subscriberIds);

    await Promise.all(
      pending.map(async (interaction) => {
        const released = await this.recordVoiceCallEnded.expireIfStale(interaction);

        return this.settlement.expireIfOverdue(released);
      })
    );
  }

  /** Minutes still stored after an unconfirmed dial. `undefined` keeps the whole Redis hold. */
  private async storedMinutes(created: HumanInteractionEntity): Promise<number | undefined> {
    const current = await this.humanInteractionRepository.findByIdentifier(created._environmentId, created.identifier);

    return current?.voiceMinutesReserved ?? created.voiceMinutesReserved;
  }
}

/**
 * The contacts whose calls are still the agent's to settle: every voice delivery
 * that no failure or hangup has closed, plus the dials still waiting to confirm.
 */
function reachedVoiceSubscriberIds(
  current: HumanInteractionEntity,
  delivered: HumanInteractionEntity,
  unconfirmedSubscriberIds: string[]
): string[] {
  const closedCalls = new Set(
    (current.deliveries ?? [])
      .filter((delivery) => delivery.voiceFailure || delivery.voiceCallEnded)
      .map((delivery) => delivery.platformMessageId)
  );
  const connected = (delivered.deliveries ?? [])
    .filter((delivery) => {
      return delivery.platform === HumanChannelViaEnum.VOICE && !closedCalls.has(delivery.platformMessageId);
    })
    .map((delivery) => delivery.subscriberId);

  return [...new Set([...connected, ...unconfirmedSubscriberIds])];
}
