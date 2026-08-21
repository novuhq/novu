import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

const KEY_PREFIX = 'agent:photon-device-auth:';
const LOCK_KEY_PREFIX = 'agent:photon-device-auth-lock:';
/** Grace on top of the flow's own expiry so a poll racing the deadline still finds its binding. */
const TTL_BUFFER_SECONDS = 60;
/**
 * The cache layer applies ±5% TTL jitter (`addJitter`), so a flat buffer can
 * land the effective TTL *below* the flow's lifetime on long expiries. A
 * proportional cushion keeps the post-jitter floor above `expiresIn`:
 * worst case 0.95 × (1.1e + 60) = 1.045e + 57 > e for every e.
 */
const TTL_JITTER_CUSHION = 0.1;
/**
 * Generously above the worst-case redeem-and-provision path (token exchange,
 * project provisioning, and a sequential stale-webhook delete loop, each call
 * on a 10s timeout). Auto-expires if a poll dies mid-flight.
 */
const POLL_LOCK_TTL_SECONDS = 300;

/**
 * Who a pending device authorization belongs to. Stored when the flow starts,
 * enforced on every poll: a device code is only redeemable by the same user,
 * against the same agent integration, that initiated it. Without this, any
 * AGENT_WRITE caller holding a leaked code could redeem another tenant's
 * approved authorization into their own integration.
 */
export interface PhotonDeviceAuthBinding {
  userId: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
}

export type PhotonDeviceAuthBindingCheck = 'valid' | 'unknown';

@Injectable()
export class PhotonDeviceAuthBindingService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Throws when the binding cannot be persisted: the poll leg fails closed on a
   * missing binding, so returning the device code without one would hand the
   * user a flow that can never complete.
   */
  async storeBinding(deviceCode: string, binding: PhotonDeviceAuthBinding, expiresInSeconds: number): Promise<void> {
    const result = await this.cacheService.set(this.storageKey(deviceCode), JSON.stringify(binding), {
      ttl: expiresInSeconds + TTL_BUFFER_SECONDS + Math.ceil(expiresInSeconds * TTL_JITTER_CUSHION),
    });

    /*
     * CacheService.set is a silent no-op when no cache client is configured
     * (`this.client?.set`) — it neither stores nor throws. Detect that here:
     * without a persisted binding the poll leg fails closed forever, so the
     * start leg must fall into its manual-credentials fallback instead of
     * handing out a code that can never be redeemed.
     */
    if (result !== 'OK') {
      throw new Error('Photon device-auth binding could not be persisted (cache unavailable)');
    }
  }

  /**
   * Serializes concurrent polls for one device code: only the lock holder may
   * redeem the code and provision, so overlapping polls (second tab, a slow
   * request outliving the poll interval) cannot double-provision. Losers report
   * pending and retry after the winner finished. The lock self-expires, so a
   * poll that dies mid-flight never wedges the flow.
   *
   * Returns an ownership token (or null when the lock is held): release is
   * token-checked, so a holder whose lock expired mid-provisioning can never
   * delete a successor's lock.
   */
  async acquirePollLock(deviceCode: string): Promise<string | null> {
    const token = randomBytes(16).toString('hex');
    const result = await this.cacheService.setIfNotExist(this.lockKey(deviceCode), token, {
      ttl: POLL_LOCK_TTL_SECONDS,
    });

    return result === 'OK' ? token : null;
  }

  /**
   * Best-effort check-then-delete (CacheService exposes no atomic
   * compare-and-delete): the read-to-delete window is microseconds against a
   * 90s TTL, and a wrongly surviving lock merely self-expires.
   */
  async releasePollLock(deviceCode: string, token: string): Promise<void> {
    try {
      const current = await this.cacheService.get(this.lockKey(deviceCode));
      if (current === token) {
        await this.cacheService.del(this.lockKey(deviceCode));
      }
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Failed to release Photon device-auth poll lock — it will self-expire'
      );
    }
  }

  /**
   * `unknown` covers every non-match — expired, never started, or bound to a
   * different user/agent/integration. Callers surface one generic "start over"
   * error so the response never confirms that a foreign code exists.
   */
  async checkBinding(deviceCode: string, expected: PhotonDeviceAuthBinding): Promise<PhotonDeviceAuthBindingCheck> {
    let raw: string | null | undefined;
    try {
      raw = await this.cacheService.get(this.storageKey(deviceCode));
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Photon device-auth binding cache unavailable during poll — failing closed'
      );

      return 'unknown';
    }

    if (!raw) {
      return 'unknown';
    }

    let stored: Partial<PhotonDeviceAuthBinding>;
    try {
      stored = JSON.parse(raw) as Partial<PhotonDeviceAuthBinding>;
    } catch {
      return 'unknown';
    }

    const matches =
      stored.userId === expected.userId &&
      stored.environmentId === expected.environmentId &&
      stored.organizationId === expected.organizationId &&
      stored.agentIdentifier === expected.agentIdentifier &&
      stored.integrationIdentifier === expected.integrationIdentifier;

    return matches ? 'valid' : 'unknown';
  }

  /** Best-effort: an expired-but-present binding is harmless, the TTL reaps it. */
  async clearBinding(deviceCode: string): Promise<void> {
    try {
      await this.cacheService.del(this.storageKey(deviceCode));
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Failed to clear Photon device-auth binding'
      );
    }
  }

  /** Keyed by hash so the cache never holds the redeemable code itself. */
  private storageKey(deviceCode: string): string {
    return `${KEY_PREFIX}${createHash('sha256').update(deviceCode).digest('hex')}`;
  }

  private lockKey(deviceCode: string): string {
    return `${LOCK_KEY_PREFIX}${createHash('sha256').update(deviceCode).digest('hex')}`;
  }
}
