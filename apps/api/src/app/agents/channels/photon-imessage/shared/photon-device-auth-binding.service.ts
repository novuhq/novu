import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

const KEY_PREFIX = 'agent:photon-device-auth:';
/** Grace on top of the flow's own expiry so a poll racing the deadline still finds its binding. */
const TTL_BUFFER_SECONDS = 60;

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
    await this.cacheService.set(this.storageKey(deviceCode), JSON.stringify(binding), {
      ttl: expiresInSeconds + TTL_BUFFER_SECONDS,
    });
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
}
