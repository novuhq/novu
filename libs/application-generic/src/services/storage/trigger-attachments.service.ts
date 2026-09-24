import { Injectable } from '@nestjs/common';
import { PinoLogger } from '../../logging';
import { CacheService } from '../cache/cache.service';
import { buildTriggerAttachmentsKey } from '../cache/key-builders';
import { StorageService } from './storage.service';

/*
 * Must outlive delay and digest steps. When the counter expires first, later
 * releases find no counter and keep the files instead of deleting them from
 * under a chain that may still read them.
 */
const REFERENCE_TTL_SECONDS = 60 * 60 * 24 * 30;

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

/**
 * Reference counts the attachments a trigger uploads once and every
 * subscriber's job chain reads, so the files are deleted only after the last
 * chain is done with them.
 *
 * The trigger's fan-out holds the count above zero while it enqueues
 * subscribers, each enqueued subscriber adds one, and each finished chain (or
 * subscriber that never started a chain) releases one. Whenever the count
 * cannot be trusted the files are kept rather than deleted.
 */
@Injectable()
export class TriggerAttachmentsService {
  /** Fan-outs whose count is short a reference, so their hold must never be released. */
  private readonly unbalancedFanOuts = new Set<string>();

  constructor(
    private cacheService: CacheService,
    private storageService: StorageService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async acquireFanOutHold(ref: TriggerAttachmentsRef): Promise<void> {
    this.unbalancedFanOuts.delete(this.buildKey(ref));
    await this.increment(ACQUIRE_SCRIPT, ref, FAN_OUT_HOLD_WEIGHT);
  }

  async retain(ref: TriggerAttachmentsRef, count: number): Promise<void> {
    if (count <= 0) {
      return;
    }

    await this.increment(RETAIN_SCRIPT, ref, count);
  }

  async releaseFanOutHold(ref: TriggerAttachmentsRef): Promise<void> {
    if (this.unbalancedFanOuts.delete(this.buildKey(ref))) {
      return;
    }

    await this.release(ref, FAN_OUT_HOLD_WEIGHT);
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

  private async increment(script: string, ref: TriggerAttachmentsRef, count: number): Promise<void> {
    if (getStoredAttachments(ref.attachments).length === 0) {
      return;
    }

    const key = this.buildKey(ref);

    try {
      const result = await this.cacheService.eval<number | null>(script, [key], [count, REFERENCE_TTL_SECONDS]);

      if (typeof result !== 'number') {
        throw new Error('Reference counter is unavailable');
      }
    } catch (error: unknown) {
      this.unbalancedFanOuts.add(key);
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

function getStoredAttachments(attachments: unknown): StoredAttachment[] {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.filter(
    (attachment): attachment is StoredAttachment =>
      typeof attachment?.storagePath === 'string' && attachment.storagePath.length > 0
  );
}
