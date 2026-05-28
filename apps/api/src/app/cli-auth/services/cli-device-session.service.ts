import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

/** Device session lifetime (seconds). Matches the CLI browser-auth timeout. */
export const CLI_DEVICE_SESSION_TTL_SECONDS = 5 * 60;

/** Recommended polling interval returned to the CLI (seconds). */
export const CLI_DEVICE_SESSION_POLL_INTERVAL_SECONDS = 2;

const CACHE_KEY_PREFIX = 'cli-device-session:';

export type CliDeviceSessionStatus = 'pending' | 'approved';

export interface CliDeviceSessionUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface CliDeviceSessionRecord {
  status: CliDeviceSessionStatus;
  name?: string;
  createdAt: string;
  approvedAt?: string;
  apiKey?: string;
  environmentId?: string;
  environmentSlug?: string | null;
  environmentName?: string | null;
  organizationId?: string | null;
  user?: CliDeviceSessionUser | null;
  approvedByUserId?: string;
}

export interface CreateCliDeviceSessionResult {
  deviceCode: string;
  expiresIn: number;
  interval: number;
}

export type PollCliDeviceSessionResult =
  | { status: 'pending'; expiresIn: number; interval: number }
  | { status: 'expired' }
  | {
      status: 'approved';
      apiKey: string;
      environmentId: string;
      environmentSlug?: string | null;
      environmentName?: string | null;
      organizationId?: string | null;
      user?: CliDeviceSessionUser | null;
    };

/**
 * Atomically read and delete an approved session so credentials are returned
 * to the CLI exactly once.
 */
const CONSUME_IF_APPROVED_SCRIPT = `
local v = redis.call('get', KEYS[1])
if not v then return '' end
local ok, payload = pcall(cjson.decode, v)
if not ok then
  redis.call('del', KEYS[1])
  return ''
end
if payload.status == 'approved' then
  redis.call('del', KEYS[1])
  return 'A' .. v
end
return 'P'
`;

@Injectable()
export class CliDeviceSessionService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async create(params: { name?: string }): Promise<CreateCliDeviceSessionResult> {
    const deviceCode = randomBytes(24).toString('base64url');
    const record: CliDeviceSessionRecord = {
      status: 'pending',
      name: params.name,
      createdAt: new Date().toISOString(),
    };

    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable — cannot persist CLI device session');

      throw new Error('Cache is required to issue CLI device sessions');
    }

    await this.cacheService.set(this.cacheKey(deviceCode), JSON.stringify(record), {
      ttl: CLI_DEVICE_SESSION_TTL_SECONDS,
    });

    return {
      deviceCode,
      expiresIn: CLI_DEVICE_SESSION_TTL_SECONDS,
      interval: CLI_DEVICE_SESSION_POLL_INTERVAL_SECONDS,
    };
  }

  async poll(deviceCode: string): Promise<PollCliDeviceSessionResult> {
    if (!deviceCode || !this.cacheService.cacheEnabled()) {
      return { status: 'expired' };
    }

    let raw: string | null = null;
    try {
      raw = await this.cacheService.eval<string | null>(CONSUME_IF_APPROVED_SCRIPT, [this.cacheKey(deviceCode)], []);
    } catch (err) {
      this.logger.warn(`Failed to poll CLI device session: ${(err as Error).message}`);

      return { status: 'expired' };
    }

    if (!raw) {
      return { status: 'expired' };
    }

    const marker = raw.charAt(0);
    const body = raw.slice(1);

    if (marker === 'P') {
      return {
        status: 'pending',
        expiresIn: CLI_DEVICE_SESSION_TTL_SECONDS,
        interval: CLI_DEVICE_SESSION_POLL_INTERVAL_SECONDS,
      };
    }

    if (marker !== 'A') {
      return { status: 'expired' };
    }

    const record = this.parseRecord(body);
    if (!record || record.status !== 'approved' || !record.apiKey || !record.environmentId) {
      return { status: 'expired' };
    }

    return {
      status: 'approved',
      apiKey: record.apiKey,
      environmentId: record.environmentId,
      environmentSlug: record.environmentSlug ?? null,
      environmentName: record.environmentName ?? null,
      organizationId: record.organizationId ?? null,
      user: record.user ?? null,
    };
  }

  async approve(params: {
    deviceCode: string;
    approvedByUserId: string;
    apiKey: string;
    environmentId: string;
    environmentSlug?: string | null;
    environmentName?: string | null;
    organizationId?: string | null;
    user?: CliDeviceSessionUser | null;
  }): Promise<void> {
    if (!params.deviceCode || !this.cacheService.cacheEnabled()) {
      throw new Error('CLI device session not found or expired');
    }

    const key = this.cacheKey(params.deviceCode);
    const existingRaw = await this.cacheService.get(key);
    const existing = existingRaw ? this.parseRecord(existingRaw) : null;

    if (!existing || existing.status !== 'pending') {
      throw new Error('CLI device session not found or expired');
    }

    const record: CliDeviceSessionRecord = {
      ...existing,
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedByUserId: params.approvedByUserId,
      apiKey: params.apiKey,
      environmentId: params.environmentId,
      environmentSlug: params.environmentSlug ?? null,
      environmentName: params.environmentName ?? null,
      organizationId: params.organizationId ?? null,
      user: params.user ?? null,
    };

    await this.cacheService.set(key, JSON.stringify(record), {
      ttl: CLI_DEVICE_SESSION_TTL_SECONDS,
    });
  }

  private parseRecord(raw: string): CliDeviceSessionRecord | null {
    try {
      const parsed = JSON.parse(raw) as CliDeviceSessionRecord;

      if (!parsed?.status || !parsed?.createdAt) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  private cacheKey(deviceCode: string): string {
    return `${CACHE_KEY_PREFIX}${deviceCode}`;
  }
}
