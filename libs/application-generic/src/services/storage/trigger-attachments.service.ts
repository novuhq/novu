import { Injectable } from '@nestjs/common';
import { PinoLogger } from '../../logging';
import { CacheService } from '../cache/cache.service';
import { buildTriggerAttachmentsKey } from '../cache/key-builders';
import { DAY_IN_MS, SYSTEM_LIMITS } from '../system-limits';
import { StorageService } from './storage.service';

/*
 * Outlives the longest step a chain can defer for. Every job that runs with the
 * attachments refreshes it, so chains that defer more than once stay covered.
 * If it still expires, later releases find no counter and keep the files
 * instead of deleting them from under a chain that may still read them.
 */
const REFERENCE_TTL_SECONDS = Math.ceil((SYSTEM_LIMITS.DEFER_DURATION_MS + 7 * DAY_IN_MS) / 1000);

// Only needs to outlive redeliveries of the same queue message.
const RELEASE_MARKER_TTL_SECONDS = 24 * 60 * 60;

/*
 * Outweighs any number of subscriber references, so a fan-out that fails to
 * retain some of them and therefore keeps its hold can never reach zero.
 */
const FAN_OUT_HOLD_WEIGHT = 1_000_000_000;

const ACQUIRE_SCRIPT = `
  local count = redis.call('incrby', KEYS[1], ARGV[1])
  redis.call('expire', KEYS[1], ARGV[2])
  return count
`;

// Only counts on top of an existing hold; without one the count is not trusted.
const RETAIN_SCRIPT = `
  if redis.call('exists', KEYS[1]) == 0 then
    return nil
  end
  local count = redis.call('incrby', KEYS[1], ARGV[1])
  redis.call('expire', KEYS[1], ARGV[2])
  return count
`;

const REFRESH_SCRIPT = `
  return redis.call('expire', KEYS[1], ARGV[1])
`;

const RELEASE_SCRIPT = `
  if redis.call('exists', KEYS[1]) == 0 then
    return nil
  end
  local count = redis.call('decrby', KEYS[1], ARGV[1])
  if count <= 0 then
    redis.call('del', KEYS[1])
  end
  return count
`;

export type TriggerAttachmentsRef = {
  environmentId: string;
  transactionId: string;
  attachments?: unknown;
};

type StoredAttachment = { storagePath: string };

type FanOutState = {
  activeCount: number;
  isUnbalanced: boolean;
};

/**
 * Reference counts the attachments a trigger uploads once and every
 * subscriber's job chain reads, so the files are deleted only after the last
 * chain is done with them.
 *
 * The trigger's fan-out holds the count above zero while it enqueues
 * subscribers, each enqueued subscriber adds one, and each chain that ends (or
 * subscriber that never started a chain) releases one. Whenever the count
 * cannot be trusted the files are kept rather than deleted.
 */
@Injectable()
export class TriggerAttachmentsService {
  /**
   * Fan-outs in progress in this process, per counter. Overlapping copies of the
   * same trigger share one state, so a missed reference in any of them keeps
   * every hold on that counter.
   */
  private readonly fanOuts = new Map<string, FanOutState>();

  constructor(
    private cacheService: CacheService,
    private storageService: StorageService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async acquireFanOutHold(ref: TriggerAttachmentsRef): Promise<void> {
    if (!hasStoredAttachments(ref)) {
      return;
    }

    const key = this.buildKey(ref);
    const state = this.fanOuts.get(key) ?? { activeCount: 0, isUnbalanced: false };
    state.activeCount += 1;
    this.fanOuts.set(key, state);

    await this.increment(ACQUIRE_SCRIPT, ref, FAN_OUT_HOLD_WEIGHT);
  }

  async retain(ref: TriggerAttachmentsRef, count: number): Promise<void> {
    if (count <= 0) {
      return;
    }

    await this.increment(RETAIN_SCRIPT, ref, count);
  }

  async releaseFanOutHold(ref: TriggerAttachmentsRef): Promise<void> {
    if (!hasStoredAttachments(ref)) {
      return;
    }

    const key = this.buildKey(ref);
    const state = this.fanOuts.get(key);
    const isUnbalanced = state?.isUnbalanced ?? false;

    if (state) {
      state.activeCount -= 1;
      if (state.activeCount <= 0) {
        this.fanOuts.delete(key);
      }
    }

    if (isUnbalanced) {
      return;
    }

    await this.release(ref, FAN_OUT_HOLD_WEIGHT);
  }

  /** Deletes the attachments of a trigger that will never fan out. */
  async discard(ref: TriggerAttachmentsRef): Promise<void> {
    await this.acquireFanOutHold(ref);
    await this.releaseFanOutHold(ref);
  }

  /** Keeps the counter alive while a chain that reads the attachments is still running. */
  async refresh(ref: TriggerAttachmentsRef): Promise<void> {
    if (!hasStoredAttachments(ref)) {
      return;
    }

    try {
      await this.cacheService.eval(REFRESH_SCRIPT, [this.buildKey(ref)], [REFERENCE_TTL_SECONDS]);
    } catch (error: unknown) {
      this.logger.warn(
        { err: error, nv: { transactionId: ref.transactionId } },
        'Failed to refresh the trigger attachment references'
      );
    }
  }

  /**
   * Best-effort: runs after the job and workflow run are already final, so a
   * cache or storage failure must not escape and rewrite that state.
   */
  async release(ref: TriggerAttachmentsRef, count = 1): Promise<void> {
    const attachments = getStoredAttachments(ref.attachments);
    if (attachments.length === 0) {
      return;
    }

    let remaining: number | null | undefined;
    try {
      remaining = await this.cacheService.eval<number | null>(RELEASE_SCRIPT, [this.buildKey(ref)], [count]);
    } catch (error: unknown) {
      this.logger.warn(
        { err: error, nv: { transactionId: ref.transactionId } },
        'Failed to release trigger attachments, they will be kept in storage'
      );

      return;
    }

    if (typeof remaining !== 'number' || remaining > 0) {
      return;
    }

    await Promise.all(
      attachments.map(async ({ storagePath }) => {
        try {
          await this.storageService.deleteFile(storagePath);
        } catch (error: unknown) {
          this.logger.warn(
            { err: error, nv: { transactionId: ref.transactionId, storagePath } },
            'Failed to delete a trigger attachment'
          );
        }
      })
    );
  }

  /**
   * Releases at most once per `releaseId`, for exits that are not guarded by a
   * job claim and may therefore run again when their queue message is redelivered.
   */
  async releaseOnce(ref: TriggerAttachmentsRef, releaseId: string): Promise<void> {
    if (!hasStoredAttachments(ref)) {
      return;
    }

    let isFirstRelease = false;
    try {
      const marker = await this.cacheService.setIfNotExist(`${this.buildKey(ref)}:released:${releaseId}`, '1', {
        ttl: RELEASE_MARKER_TTL_SECONDS,
      });
      isFirstRelease = marker === 'OK';
    } catch (error: unknown) {
      this.logger.warn(
        { err: error, nv: { transactionId: ref.transactionId } },
        'Failed to mark trigger attachments as released, they will be kept in storage'
      );
    }

    if (!isFirstRelease) {
      return;
    }

    await this.release(ref);
  }

  private async increment(script: string, ref: TriggerAttachmentsRef, count: number): Promise<void> {
    if (!hasStoredAttachments(ref)) {
      return;
    }

    const key = this.buildKey(ref);

    try {
      const result = await this.cacheService.eval<number | null>(script, [key], [count, REFERENCE_TTL_SECONDS]);

      if (typeof result !== 'number') {
        throw new Error('Reference counter is unavailable');
      }
    } catch (error: unknown) {
      const state = this.fanOuts.get(key);
      if (state) {
        state.isUnbalanced = true;
      }

      this.logger.warn(
        { err: error, nv: { transactionId: ref.transactionId } },
        'Failed to count trigger attachment references, they will be kept in storage'
      );
    }
  }

  private buildKey(ref: TriggerAttachmentsRef): string {
    return buildTriggerAttachmentsKey({ _environmentId: ref.environmentId, transactionId: ref.transactionId });
  }
}

function hasStoredAttachments(ref: TriggerAttachmentsRef): boolean {
  return getStoredAttachments(ref.attachments).length > 0;
}

function getStoredAttachments(attachments: unknown): StoredAttachment[] {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.filter(
    (attachment): attachment is StoredAttachment =>
      typeof attachment?.storagePath === 'string' && attachment.storagePath.length > 0
  );
}
