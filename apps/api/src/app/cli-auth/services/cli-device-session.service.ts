import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS,
  CLI_DEVICE_SESSION_CONNECT_TTL_SECONDS,
  CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS,
  type CliDeviceSessionPollResponse,
  type CliDeviceSessionUser,
  type CreateCliDeviceSessionResponse,
} from '@novu/shared';
import { CacheService, PinoLogger } from '@novu/application-generic';

const CLI_DEVICE_SESSION_POLL_INTERVAL_SECONDS = 2;

const CACHE_KEY_PREFIX = 'cli-device-session:';

export class CliDeviceSessionNotFoundError extends Error {
  constructor(message = 'CLI device session not found or expired') {
    super(message);
    this.name = 'CliDeviceSessionNotFoundError';
  }
}

type CliDeviceSessionStatus = 'pending' | 'approved';

interface CliDeviceSessionRecord {
  status: CliDeviceSessionStatus;
  name?: string;
  createdAt: string;
  createdAtEpoch: number;
  sessionTtlSeconds: number;
  slideTtlOnPoll: boolean;
  approvedAt?: string;
  apiKey?: string;
  environmentId?: string;
  environmentSlug?: string | null;
  environmentName?: string | null;
  organizationId?: string | null;
  user?: CliDeviceSessionUser | null;
  approvedByUserId?: string;
}

const APPROVE_IF_PENDING_SCRIPT = `
local v = redis.call('get', KEYS[1])
if not v then return 0 end
local ok, payload = pcall(cjson.decode, v)
if not ok or payload.status ~= 'pending' then return 0 end
redis.call('setex', KEYS[1], ARGV[1], ARGV[2])
return 1
`;

const POLL_DEVICE_SESSION_SCRIPT = `
local v = redis.call('get', KEYS[1])
if not v then return '' end
local ok, payload = pcall(cjson.decode, v)
if not ok then
  redis.call('del', KEYS[1])
  return 'CORRUPT'
end
if payload.status == 'pending' then
  if payload.slideTtlOnPoll then
    local ttl = tonumber(ARGV[1])
    local maxLifetime = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local createdAt = tonumber(payload.createdAtEpoch) or 0
    if maxLifetime > 0 and createdAt > 0 and (now - createdAt) >= maxLifetime then
      redis.call('del', KEYS[1])
      return 'EXPIRED'
    end
    if ttl and ttl > 0 then
      redis.call('expire', KEYS[1], ttl)
    end
  end
  return 'PENDING'
end
if payload.status == 'approved' and payload.apiKey and payload.environmentId then
  redis.call('del', KEYS[1])
  return v
end
redis.call('del', KEYS[1])
return 'CORRUPT'
`;

@Injectable()
export class CliDeviceSessionService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async create(params: { name?: string }): Promise<CreateCliDeviceSessionResponse> {
    const deviceCode = randomBytes(24).toString('base64url');
    const sessionConfig = resolveSessionConfig(params.name);
    const record: CliDeviceSessionRecord = {
      status: 'pending',
      name: params.name,
      createdAt: new Date().toISOString(),
      createdAtEpoch: Math.floor(Date.now() / 1000),
      sessionTtlSeconds: sessionConfig.ttlSeconds,
      slideTtlOnPoll: sessionConfig.slideTtlOnPoll,
    };

    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable — cannot persist CLI device session');

      throw new Error('Cache is required to issue CLI device sessions');
    }

    await this.cacheService.set(this.cacheKey(deviceCode), JSON.stringify(record), {
      ttl: sessionConfig.ttlSeconds,
    });

    return {
      deviceCode,
      expiresIn: sessionConfig.ttlSeconds,
      interval: CLI_DEVICE_SESSION_POLL_INTERVAL_SECONDS,
    };
  }

  async poll(deviceCode: string): Promise<CliDeviceSessionPollResponse> {
    if (!deviceCode || !this.cacheService.cacheEnabled()) {
      return { status: 'expired' };
    }

    const key = this.cacheKey(deviceCode);
    const existingRaw = await this.cacheService.get(key);
    const existing = existingRaw ? this.parseRecord(existingRaw) : null;

    if (!existing) {
      return { status: 'expired' };
    }

    const pollResult = await this.cacheService.eval<string>(POLL_DEVICE_SESSION_SCRIPT, [key], [
      String(existing.sessionTtlSeconds),
      String(existing.slideTtlOnPoll ? CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS : 0),
      String(Math.floor(Date.now() / 1000)),
    ]);

    if (!pollResult) {
      return { status: 'expired' };
    }

    if (pollResult === 'PENDING') {
      return {
        status: 'pending',
        expiresIn: existing.sessionTtlSeconds,
        interval: CLI_DEVICE_SESSION_POLL_INTERVAL_SECONDS,
      };
    }

    if (pollResult === 'EXPIRED' || pollResult === 'CORRUPT') {
      return { status: 'expired' };
    }

    const record = this.parseRecord(pollResult);
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
      throw new CliDeviceSessionNotFoundError();
    }

    const key = this.cacheKey(params.deviceCode);
    const existingRaw = await this.cacheService.get(key);
    const existing = existingRaw ? this.parseRecord(existingRaw) : null;

    if (!existing) {
      throw new CliDeviceSessionNotFoundError();
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

    const approved = await this.cacheService.eval<number>(
      APPROVE_IF_PENDING_SCRIPT,
      [key],
      [existing.sessionTtlSeconds, JSON.stringify(record)]
    );

    if (approved !== 1) {
      throw new CliDeviceSessionNotFoundError();
    }
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

function resolveSessionConfig(name?: string): {
  ttlSeconds: number;
  slideTtlOnPoll: boolean;
} {
  if (name === 'novu-connect') {
    return {
      ttlSeconds: CLI_DEVICE_SESSION_CONNECT_TTL_SECONDS,
      slideTtlOnPoll: true,
    };
  }

  return {
    ttlSeconds: CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS,
    slideTtlOnPoll: false,
  };
}
