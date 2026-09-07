import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import {
  CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS,
  CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS,
  type CliDeviceSessionPollResponse,
  type CliDeviceSessionUser,
  type CreateCliDeviceSessionResponse,
  resolveCliDeviceSessionConfig,
} from '@novu/shared';

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
local defaultTtl = tonumber(ARGV[1])
local maxLifetime = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
if payload.status == 'pending' then
  local sessionTtl = tonumber(payload.sessionTtlSeconds) or defaultTtl
  if payload.slideTtlOnPoll then
    local createdAt = tonumber(payload.createdAtEpoch) or 0
    if maxLifetime > 0 and createdAt > 0 and (now - createdAt) >= maxLifetime then
      redis.call('del', KEYS[1])
      return 'EXPIRED'
    end
    if sessionTtl and sessionTtl > 0 then
      redis.call('expire', KEYS[1], sessionTtl)
    end
  end
  return 'PENDING:' .. tostring(sessionTtl)
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
    const sessionConfig = resolveCliDeviceSessionConfig(params.name);
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

    const pollResult = await this.cacheService.eval<string>(
      POLL_DEVICE_SESSION_SCRIPT,
      [key],
      [
        String(CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS),
        String(CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS),
        String(Math.floor(Date.now() / 1000)),
      ]
    );

    if (!pollResult) {
      return { status: 'expired' };
    }

    if (pollResult.startsWith('PENDING:')) {
      const expiresIn = Number(pollResult.slice('PENDING:'.length)) || CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS;

      return {
        status: 'pending',
        expiresIn,
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
      const parsed = JSON.parse(raw) as Partial<CliDeviceSessionRecord>;

      if (!parsed?.status || !parsed?.createdAt) {
        return null;
      }

      const sessionConfig = resolveCliDeviceSessionConfig(parsed.name);
      const createdAtEpoch = parsed.createdAtEpoch ?? Math.floor(new Date(parsed.createdAt).getTime() / 1000);

      return {
        status: parsed.status,
        name: parsed.name,
        createdAt: parsed.createdAt,
        createdAtEpoch,
        sessionTtlSeconds: parsed.sessionTtlSeconds ?? sessionConfig.ttlSeconds,
        slideTtlOnPoll: parsed.slideTtlOnPoll ?? sessionConfig.slideTtlOnPoll,
        approvedAt: parsed.approvedAt,
        apiKey: parsed.apiKey,
        environmentId: parsed.environmentId,
        environmentSlug: parsed.environmentSlug,
        environmentName: parsed.environmentName,
        organizationId: parsed.organizationId,
        user: parsed.user,
        approvedByUserId: parsed.approvedByUserId,
      };
    } catch {
      return null;
    }
  }

  private cacheKey(deviceCode: string): string {
    return `${CACHE_KEY_PREFIX}${deviceCode}`;
  }
}
