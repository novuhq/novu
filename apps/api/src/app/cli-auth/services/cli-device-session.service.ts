import { randomBytes, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import {
  CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS,
  CLI_DEVICE_SESSION_DEFAULT_TTL_SECONDS,
  CLI_DEVICE_SESSION_NAME_HUMAN_CLI,
  CLI_USER_CODE_ALPHABET,
  type CliDeviceSessionUser,
  type CreateCliDeviceSessionResponse,
  resolveCliDeviceSessionConfig,
  type CliDeviceSessionPollResponse as SharedCliDeviceSessionPollResponse,
} from '@novu/shared';

import { buildHumanCliLoginUrl } from '../../shared/helpers/resolve-human-dashboard-base-url';

const CLI_DEVICE_SESSION_POLL_INTERVAL_SECONDS = 2;

const CACHE_KEY_PREFIX = 'cli-device-session:';

const USER_CODE_KEY_PREFIX = 'cli-device-session-user-code:';

const USER_CODE_ATTEMPTS = 5;

/** A denied session is kept this long, so the waiting CLI's next poll can tell it apart from an expired one. */
const DENIED_SESSION_TTL_SECONDS = 5 * 60;

/** Longest machine name kept with a session. Hostnames can be far longer than anyone reads on a page. */
export const CLI_MACHINE_NAME_MAX_LENGTH = 64;

/** `denied` is only ever answered to `human login`, the one CLI whose approval page has a Deny button. */
export type CliDeviceSessionPollResponse = SharedCliDeviceSessionPollResponse | { status: 'denied' };

/** A session still waiting for an answer, as the page that approves or denies it sees it. */
export type PendingCliDeviceSession = {
  deviceCode: string;
  /** Name of the computer the CLI runs on, as that CLI reported it. Never verified: show it as plain text. */
  machineName?: string;
};

export class CliDeviceSessionNotFoundError extends Error {
  constructor(message = 'CLI device session not found or expired') {
    super(message);
    this.name = 'CliDeviceSessionNotFoundError';
  }
}

type CliDeviceSessionStatus = 'pending' | 'approved' | 'denied';

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
  userCode?: string;
  machineName?: string;
}

const APPROVE_IF_PENDING_SCRIPT = `
local v = redis.call('get', KEYS[1])
if not v then return 0 end
local ok, payload = pcall(cjson.decode, v)
if not ok or payload.status ~= 'pending' then return 0 end
redis.call('setex', KEYS[1], ARGV[1], ARGV[2])
return 1
`;

/** Turns a pending session into a denied one that only says so: the poll that reads it gets no key. */
const DENY_IF_PENDING_SCRIPT = `
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
if payload.status == 'denied' then
  redis.call('del', KEYS[1])
  return 'DENIED'
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

  async create(params: { name?: string; machineName?: string }): Promise<CreateCliDeviceSessionResponse> {
    const deviceCode = randomBytes(24).toString('base64url');
    const sessionConfig = resolveCliDeviceSessionConfig(params.name);

    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable — cannot persist CLI device session');

      throw new Error('Cache is required to issue CLI device sessions');
    }

    // `human login` is approved on the Human dashboard under a short user code, so the device code the CLI polls
    // with never reaches a browser. The link carries the user code for the page to show next to the terminal's;
    // it approves nothing by itself: a signed-in person still has to press Approve there.
    const isHumanLogin = params.name === CLI_DEVICE_SESSION_NAME_HUMAN_CLI && Boolean(buildHumanCliLoginUrl());
    const userCode = isHumanLogin ? await this.reserveUserCode(deviceCode, sessionConfig.ttlSeconds) : undefined;
    const verificationUrl = userCode ? buildHumanCliLoginUrl(userCode) : undefined;
    const machineName = isHumanLogin ? cleanMachineName(params.machineName) : undefined;

    const record: CliDeviceSessionRecord = {
      status: 'pending',
      name: params.name,
      createdAt: new Date().toISOString(),
      createdAtEpoch: Math.floor(Date.now() / 1000),
      sessionTtlSeconds: sessionConfig.ttlSeconds,
      slideTtlOnPoll: sessionConfig.slideTtlOnPoll,
      ...(userCode ? { userCode } : {}),
      ...(machineName ? { machineName } : {}),
    };

    await this.cacheService.set(this.cacheKey(deviceCode), JSON.stringify(record), {
      ttl: sessionConfig.ttlSeconds,
    });

    return {
      deviceCode,
      expiresIn: sessionConfig.ttlSeconds,
      interval: CLI_DEVICE_SESSION_POLL_INTERVAL_SECONDS,
      ...(verificationUrl && userCode ? { verificationUrl, userCode } : {}),
    };
  }

  /** The device code of the session still waiting for approval under this user code, if there is one. */
  async findPendingByUserCode(userCode: string): Promise<string | null> {
    return (await this.getPendingByUserCode(userCode))?.deviceCode ?? null;
  }

  /** The session still waiting for an answer under this user code. Approved, denied and expired ones are gone. */
  async getPendingByUserCode(userCode: string): Promise<PendingCliDeviceSession | null> {
    if (!userCode || !this.cacheService.cacheEnabled()) {
      return null;
    }

    const deviceCode = await this.cacheService.get(this.userCodeKey(userCode));
    const raw = deviceCode ? await this.cacheService.get(this.cacheKey(deviceCode)) : null;
    const record = raw ? this.parseRecord(raw) : null;

    if (!deviceCode || record?.status !== 'pending' || record.userCode !== userCode) {
      return null;
    }

    return { deviceCode, ...(record.machineName ? { machineName: record.machineName } : {}) };
  }

  /**
   * Ends the session waiting under this user code without letting the CLI in: the code stops working at once,
   * and the CLI's next poll is told it was denied. False when no session was waiting (anymore).
   */
  async denyByUserCode(userCode: string): Promise<boolean> {
    const pending = await this.getPendingByUserCode(userCode);
    if (!pending) {
      return false;
    }

    const key = this.cacheKey(pending.deviceCode);
    const existingRaw = await this.cacheService.get(key);
    const existing = existingRaw ? this.parseRecord(existingRaw) : null;
    if (!existing) {
      return false;
    }

    const record: CliDeviceSessionRecord = { ...existing, status: 'denied' };
    const denied = await this.cacheService.eval<number>(
      DENY_IF_PENDING_SCRIPT,
      [key],
      [DENIED_SESSION_TTL_SECONDS, JSON.stringify(record)]
    );

    return denied === 1;
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

    if (pollResult === 'DENIED') {
      return { status: 'denied' };
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
        userCode: parsed.userCode,
        machineName: parsed.machineName,
      };
    } catch {
      return null;
    }
  }

  /**
   * Points a fresh user code at the session. Polling can keep a session alive for the whole polling window, and
   * the last poll extends it by one more TTL, so the code is kept that long, without the cache's TTL jitter.
   * A code that outlives its session is harmless: the lookup also needs the session to be pending.
   */
  private async reserveUserCode(deviceCode: string, sessionTtlSeconds: number): Promise<string> {
    for (let attempt = 0; attempt < USER_CODE_ATTEMPTS; attempt++) {
      const userCode = generateUserCode();
      const reserved = await this.cacheService.setIfNotExist(this.userCodeKey(userCode), deviceCode, {
        ttl: CLI_DEVICE_SESSION_CONNECT_MAX_POLL_SECONDS + sessionTtlSeconds,
        jitter: false,
      });

      if (reserved === 'OK') {
        return userCode;
      }
    }

    throw new Error('Could not issue a unique CLI user code');
  }

  private cacheKey(deviceCode: string): string {
    return `${CACHE_KEY_PREFIX}${deviceCode}`;
  }

  private userCodeKey(userCode: string): string {
    return `${USER_CODE_KEY_PREFIX}${userCode}`;
  }
}

/**
 * The machine name is whatever the CLI sent, so it's cut down to one short line of visible characters
 * before it's kept. Pages still have to render it as text.
 */
function cleanMachineName(input: string | undefined): string | undefined {
  const cleaned = (input ?? '')
    // Control and invisible formatting characters (bidi overrides, zero-width joiners) could disguise the name.
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CLI_MACHINE_NAME_MAX_LENGTH)
    .trim();

  return cleaned || undefined;
}

/** Eight letters, e.g. `BCDF-GHJK`: about 2.5e10 codes, against at most a handful waiting at once. */
function generateUserCode(): string {
  const letters = Array.from({ length: 8 }, () => CLI_USER_CODE_ALPHABET[randomInt(CLI_USER_CODE_ALPHABET.length)]);

  return `${letters.slice(0, 4).join('')}-${letters.slice(4).join('')}`;
}
