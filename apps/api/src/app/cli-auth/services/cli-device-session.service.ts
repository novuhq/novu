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

/**
 * How long an approval's hold on a session lasts unless it is renewed. An approval at work keeps renewing it,
 * and one that fails gives the session back at once; this only ends the hold of one that never came back.
 */
const APPROVAL_HOLD_SECONDS = 60;

/** How often an approval at work renews its hold. Two renewals in a row can fail before the hold runs out. */
const APPROVAL_HOLD_RENEW_SECONDS = 20;

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

/** A session held for one approval, which renews the hold and gives the session back with this. */
export type CliDeviceSessionApprovalHold = {
  deviceCode: string;
  /** Tells this approval's hold from a later one's, however often either was renewed. */
  holdId: string;
};

export class CliDeviceSessionNotFoundError extends Error {
  constructor(message = 'CLI device session not found or expired') {
    super(message);
    this.name = 'CliDeviceSessionNotFoundError';
  }
}

/** An approval holds the session, so nothing else can answer it until that approval is done. */
export class CliDeviceSessionBeingApprovedError extends Error {
  constructor(message = 'CLI device session is being approved') {
    super(message);
    this.name = 'CliDeviceSessionBeingApprovedError';
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
  /** Both set while an approval holds the session. Only the scripts read them: `parseRecord` leaves them out. */
  approvalHoldId?: string;
  approvalHeldUntilEpoch?: number;
}

const APPROVE_IF_PENDING_SCRIPT = `
local v = redis.call('get', KEYS[1])
if not v then return 0 end
local ok, payload = pcall(cjson.decode, v)
if not ok or payload.status ~= 'pending' then return 0 end
redis.call('setex', KEYS[1], ARGV[1], ARGV[2])
return 1
`;

/** What the script below answers for a pending session that an approval holds. */
const HELD_BY_AN_APPROVAL = 2;

/**
 * Replaces a pending session that no approval holds: with a denied one that only says so (the poll that reads
 * it gets no key), or with one held for an approval. A session an approval holds is left as it is.
 */
const REPLACE_IF_PENDING_AND_NOT_HELD_SCRIPT = `
local v = redis.call('get', KEYS[1])
if not v then return 0 end
local ok, payload = pcall(cjson.decode, v)
if not ok or payload.status ~= 'pending' then return 0 end
if (tonumber(payload.approvalHeldUntilEpoch) or 0) > tonumber(ARGV[3]) then return ${HELD_BY_AN_APPROVAL} end
redis.call('setex', KEYS[1], ARGV[1], ARGV[2])
return 1
`;

/**
 * Replaces a pending session that one approval holds, to renew that hold or to end it. A later approval's hold
 * is left alone, even after this one's ran out. How long the session still lives stays as it is.
 */
const REPLACE_IF_HELD_BY_SCRIPT = `
local v = redis.call('get', KEYS[1])
if not v then return 0 end
local ok, payload = pcall(cjson.decode, v)
if not ok or payload.status ~= 'pending' then return 0 end
if payload.approvalHoldId ~= ARGV[3] then return 0 end
local ttl = redis.call('pttl', KEYS[1])
if ttl > 0 then
  redis.call('psetex', KEYS[1], ttl, ARGV[2])
else
  redis.call('setex', KEYS[1], ARGV[1], ARGV[2])
end
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

  /** The session still waiting for an answer under this user code. Approved, denied and expired ones are gone. */
  async getPendingByUserCode(userCode: string): Promise<PendingCliDeviceSession | null> {
    const pending = await this.readPendingByUserCode(userCode);
    if (!pending) {
      return null;
    }

    const { deviceCode, record } = pending;

    return { deviceCode, ...(record.machineName ? { machineName: record.machineName } : {}) };
  }

  /**
   * Holds the session waiting under this user code for one approval. Until that approval is written, the hold
   * is released or it runs out unrenewed, the session can't be denied or held a second time. So no denial
   * gets between an approval creating or moving things and that approval letting the CLI in.
   * Null when no session is waiting; throws `CliDeviceSessionBeingApprovedError` when another approval holds it.
   */
  async holdForApprovalByUserCode(userCode: string): Promise<CliDeviceSessionApprovalHold | null> {
    const pending = await this.readPendingByUserCode(userCode);
    if (!pending) {
      return null;
    }

    const { deviceCode, record } = pending;
    const hold: CliDeviceSessionApprovalHold = { deviceCode, holdId: randomBytes(12).toString('base64url') };
    const held = await this.replacePendingUnlessHeld(deviceCode, heldBy(record, hold), record.sessionTtlSeconds);

    return held ? hold : null;
  }

  /**
   * Starts the hold's `APPROVAL_HOLD_SECONDS` again. False when the session is no longer held for this
   * approval: it was approved, denied or ran out, or the hold ran out and another approval took the session.
   */
  async renewApprovalHold(hold: CliDeviceSessionApprovalHold): Promise<boolean> {
    const existing = await this.readRecord(hold.deviceCode);

    return existing ? this.replaceHeldBy(hold, heldBy(existing, hold)) : false;
  }

  /**
   * Runs `work` with the hold renewed every `APPROVAL_HOLD_RENEW_SECONDS`, so the hold lasts as long as the
   * work does, however slow that is. Renewing ends with the work, or once the hold is no longer this approval's.
   */
  async whileRenewingApprovalHold<T>(hold: CliDeviceSessionApprovalHold, work: () => Promise<T>): Promise<T> {
    const timer = setInterval(() => {
      this.renewApprovalHold(hold).then(
        (renewed) => {
          if (!renewed) {
            clearInterval(timer);
          }
        },
        // The next round tries again, and the hold outlasts two rounds that fail.
        (error) => this.logger.warn({ err: error }, 'Could not renew the approval hold of a CLI device session')
      );
    }, APPROVAL_HOLD_RENEW_SECONDS * 1000);
    timer.unref();

    try {
      return await work();
    } finally {
      clearInterval(timer);
    }
  }

  /**
   * Gives back a session whose approval didn't go through, so it can be approved again or denied right away.
   * Changes nothing once the session was approved, or once another approval holds it.
   */
  async releaseApprovalHold(hold: CliDeviceSessionApprovalHold): Promise<void> {
    const existing = await this.readRecord(hold.deviceCode);
    if (!existing) {
      return;
    }

    // The parsed record comes without the hold, so writing it back is what releases the session.
    await this.replaceHeldBy(hold, existing);
  }

  /**
   * Ends the session waiting under this user code without letting the CLI in: the code stops working at once,
   * and the CLI's next poll is told it was denied. False when no session was waiting (anymore); throws
   * `CliDeviceSessionBeingApprovedError` when an approval holds it, since that approval may still let the CLI in.
   */
  async denyByUserCode(userCode: string): Promise<boolean> {
    const pending = await this.readPendingByUserCode(userCode);
    if (!pending) {
      return false;
    }

    return this.replacePendingUnlessHeld(
      pending.deviceCode,
      { ...pending.record, status: 'denied' },
      DENIED_SESSION_TTL_SECONDS
    );
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

  private async readPendingByUserCode(
    userCode: string
  ): Promise<{ deviceCode: string; record: CliDeviceSessionRecord } | null> {
    if (!userCode || !this.cacheService.cacheEnabled()) {
      return null;
    }

    const deviceCode = await this.cacheService.get(this.userCodeKey(userCode));
    const raw = deviceCode ? await this.cacheService.get(this.cacheKey(deviceCode)) : null;
    const record = raw ? this.parseRecord(raw) : null;

    if (!deviceCode || record?.status !== 'pending' || record.userCode !== userCode) {
      return null;
    }

    return { deviceCode, record };
  }

  /**
   * Swaps a pending session for `record` in one step. False when the session wasn't pending anymore; throws
   * `CliDeviceSessionBeingApprovedError` when an approval holds it.
   */
  private async replacePendingUnlessHeld(
    deviceCode: string,
    record: CliDeviceSessionRecord,
    ttlSeconds: number
  ): Promise<boolean> {
    const replaced = await this.cacheService.eval<number>(
      REPLACE_IF_PENDING_AND_NOT_HELD_SCRIPT,
      [this.cacheKey(deviceCode)],
      [ttlSeconds, JSON.stringify(record), Math.floor(Date.now() / 1000)]
    );

    if (replaced === HELD_BY_AN_APPROVAL) {
      throw new CliDeviceSessionBeingApprovedError();
    }

    return replaced === 1;
  }

  /** Swaps a pending session that `hold` is on for `record` in one step. False when that hold isn't on it. */
  private async replaceHeldBy(hold: CliDeviceSessionApprovalHold, record: CliDeviceSessionRecord): Promise<boolean> {
    const replaced = await this.cacheService.eval<number>(
      REPLACE_IF_HELD_BY_SCRIPT,
      [this.cacheKey(hold.deviceCode)],
      [record.sessionTtlSeconds, JSON.stringify(record), hold.holdId]
    );

    return replaced === 1;
  }

  private async readRecord(deviceCode: string): Promise<CliDeviceSessionRecord | null> {
    if (!deviceCode || !this.cacheService.cacheEnabled()) {
      return null;
    }

    const raw = await this.cacheService.get(this.cacheKey(deviceCode));

    return raw ? this.parseRecord(raw) : null;
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

/** The session as `hold` has it from now on, for `APPROVAL_HOLD_SECONDS` unless that is renewed. */
function heldBy(record: CliDeviceSessionRecord, hold: CliDeviceSessionApprovalHold): CliDeviceSessionRecord {
  return {
    ...record,
    approvalHoldId: hold.holdId,
    approvalHeldUntilEpoch: Math.floor(Date.now() / 1000) + APPROVAL_HOLD_SECONDS,
  };
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
