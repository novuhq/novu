import { randomInt } from 'node:crypto';
import {
  HttpException,
  HttpStatus,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

import { isValidEmailForLookup, normalizeEmailForLookup } from '../../agents/shared/util/email-normalization';
import {
  HUMAN_VERIFICATION_LINK_TTL_SECONDS,
  type HumanVerificationTokenPayload,
} from './human-verification-token.service';

/** Wrong codes one pending slot accepts before that code stops working. A resend starts a new slot. */
export const HUMAN_VERIFICATION_CODE_MAX_SLOT_FAILURES = 10;

/**
 * Wrong codes one network can send for one address, and for any addresses together, in
 * {@link HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS}. Copied from the connect-code caps.
 */
export const HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES = 10;
export const HUMAN_VERIFICATION_CODE_MAX_NETWORK_FAILURES = 30;
export const HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS = 10 * 60;

const CODE_ISSUE_ATTEMPTS = 5;

export const VERIFICATION_CODE_INVALID = 'verification_code_invalid';
export const VERIFICATION_CODE_TOO_MANY_TRIES = 'verification_code_too_many_tries';

export type RedeemedVerificationCode = {
  payload: HumanVerificationTokenPayload;
  /** True when an earlier request already redeemed this code. Confirming again is still success. */
  alreadyUsed: boolean;
};

/**
 * Reserves `ARGV[1]` under `KEYS[1]` for `ARGV[2]` seconds, and remembers its slot on `KEYS[2]`
 * so wrong guesses can be counted against every code still live for this address.
 * Returns 1 when the code was stored, 0 when that code was already taken.
 */
const ISSUE_SCRIPT = `
local ok = redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[2]), 'NX')
if not ok then return 0 end
redis.call('SADD', KEYS[2], ARGV[3])
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[2]))
return 1
`;

/**
 * Takes the code once, or counts a wrong one.
 * A code that is still live is redeemed even after this network has used up its guesses,
 * so a resend (a new slot) works straight away. Wrong, expired and unknown codes share one outcome.
 * KEYS: the code, the address's live slots, this network's wrong tries for the address.
 * ARGV: now (epoch seconds), max wrong tries per slot, max wrong tries per address for this network,
 * their window, and how long a new slot counter is kept.
 * Returns OK/USED plus the payload JSON, INVALID, BLOCKED (the address cap was already hit),
 * TOO_MANY_SLOT, or TOO_MANY_ADDR.
 */
const REDEEM_SCRIPT = `
local function countWrong()
  local addrFails = tonumber(redis.call('GET', KEYS[3]) or '0')
  if addrFails >= tonumber(ARGV[3]) then return 'BLOCKED' end
  local n = redis.call('INCR', KEYS[3])
  if n == 1 then redis.call('EXPIRE', KEYS[3], ARGV[4]) end
  local locked = false
  local slots = redis.call('SMEMBERS', KEYS[2])
  for _, slotKey in ipairs(slots) do
    local c = redis.call('INCR', slotKey)
    if c == 1 then
      local ttl = redis.call('TTL', KEYS[2])
      if ttl < 1 then ttl = tonumber(ARGV[5]) end
      redis.call('EXPIRE', slotKey, ttl)
    end
    if c >= tonumber(ARGV[2]) then locked = true end
  end
  if locked then return 'TOO_MANY_SLOT' end
  if n >= tonumber(ARGV[3]) then return 'TOO_MANY_ADDR' end
  return 'INVALID'
end

local raw = redis.call('GET', KEYS[1])
local ok, record = false, nil
if raw then ok, record = pcall(cjson.decode, raw) end
if ok and record and record.payload and record.slotKey and tonumber(record.expiresAt) > tonumber(ARGV[1]) then
  local fails = tonumber(redis.call('GET', record.slotKey) or '0')
  if fails >= tonumber(ARGV[2]) then return 'TOO_MANY_SLOT' end
  local payload = cjson.encode(record.payload)
  if record.usedAt then return 'USED' .. payload end
  record.usedAt = tonumber(ARGV[1])
  local ttl = redis.call('TTL', KEYS[1])
  if ttl < 1 then ttl = 1 end
  redis.call('SETEX', KEYS[1], ttl, cjson.encode(record))
  return 'OK' .. payload
end

return countWrong()
`;

/** Puts a redeemed code back so the same entry can retry after a failed write. */
const RELEASE_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 0 end
local ok, record = pcall(cjson.decode, raw)
if not ok or not record then return 0 end
record.usedAt = nil
local ttl = redis.call('TTL', KEYS[1])
if ttl < 1 then return 0 end
redis.call('SETEX', KEYS[1], ttl, cjson.encode(record))
return 1
`;

/** Counts one more on a key that runs out `ARGV[1]` seconds after its first count. */
const COUNT_SCRIPT = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return n
`;

type StoredCode = {
  payload: HumanVerificationTokenPayload;
  expiresAt: number;
  slotKey: string;
  usedAt?: number;
};

/**
 * Six-digit codes mailed next to the verification link. Keyed by the address plus the code,
 * so a guess has to name the inbox too. The link is a separate credential and is not touched here.
 */
@Injectable()
export class HumanVerificationCodeService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async issue(payload: HumanVerificationTokenPayload): Promise<{ code: string; expiresAt: string }> {
    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable — cannot issue a Human verification code');

      throw codesUnavailable();
    }

    const address = normalizeEmailForLookup(payload.address);
    const expiresAt = Math.floor(Date.now() / 1000) + HUMAN_VERIFICATION_LINK_TTL_SECONDS;
    const slotKey = slotCounterKey(address, payload);
    const record: StoredCode = { payload: { ...payload, address }, expiresAt, slotKey };

    for (let attempt = 0; attempt < CODE_ISSUE_ATTEMPTS; attempt++) {
      const code = generateCode();
      const reserved = await this.cacheService.eval<number>(
        ISSUE_SCRIPT,
        [codeKey(address, code), slotsKey(address)],
        [JSON.stringify(record), HUMAN_VERIFICATION_LINK_TTL_SECONDS, slotKey]
      );

      if (reserved === 1) {
        return { code, expiresAt: new Date(expiresAt * 1000).toISOString() };
      }
    }

    throw new Error('Could not issue a unique Human verification code');
  }

  /**
   * Uses the code once. A wrong, expired, or unknown code is the same invalid error.
   * Ten wrong tries on the pending slot lock that code; the link keeps working.
   */
  async redeem(addressInput: string, codeInput: string, clientIp?: string): Promise<RedeemedVerificationCode> {
    const address = normalizeEmailForLookup(addressInput);
    const code = normalizeVerificationCode(codeInput);
    if (!isValidEmailForLookup(address) || !code) {
      throw invalidCode();
    }

    if (!this.cacheService.cacheEnabled()) {
      throw codesUnavailable();
    }

    const network = clientIp?.trim() || 'unknown';
    const networkKey = networkFailuresKey(network);
    if (Number(await this.cacheService.get(networkKey)) >= HUMAN_VERIFICATION_CODE_MAX_NETWORK_FAILURES) {
      throw tooManyTries(HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS);
    }

    let result: string | null;
    try {
      result = await this.cacheService.eval<string | null>(
        REDEEM_SCRIPT,
        [codeKey(address, code), slotsKey(address), addressFailuresKey(address, network)],
        [
          Math.floor(Date.now() / 1000),
          HUMAN_VERIFICATION_CODE_MAX_SLOT_FAILURES,
          HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES,
          HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS,
          HUMAN_VERIFICATION_LINK_TTL_SECONDS,
        ]
      );
    } catch (err) {
      this.logger.warn({ err }, 'Failed to redeem a Human verification code');

      throw codesUnavailable();
    }

    if (!result || result === 'INVALID') {
      await this.countNetwork(networkKey);
      throw invalidCode();
    }

    if (result === 'BLOCKED' || result === 'TOO_MANY_ADDR') {
      if (result === 'TOO_MANY_ADDR') {
        await this.countNetwork(networkKey);
      }

      throw tooManyTries(HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS);
    }

    if (result === 'TOO_MANY_SLOT') {
      await this.countNetwork(networkKey);

      throw tooManyTries(0);
    }

    const alreadyUsed = result.startsWith('USED');
    const payload = parsePayload(result.slice(alreadyUsed ? 4 : 2));
    if (!payload) {
      throw invalidCode();
    }

    return { payload, alreadyUsed };
  }

  /** Gives a just-redeemed code back when the address write failed, so the person can retry it. */
  async release(addressInput: string, codeInput: string): Promise<void> {
    const address = normalizeEmailForLookup(addressInput);
    const code = normalizeVerificationCode(codeInput);
    if (!isValidEmailForLookup(address) || !code || !this.cacheService.cacheEnabled()) {
      return;
    }

    try {
      await this.cacheService.eval(RELEASE_SCRIPT, [codeKey(address, code)], []);
    } catch (err) {
      this.logger.warn({ err }, 'Failed to release a Human verification code');
    }
  }

  private async countNetwork(networkKey: string): Promise<void> {
    await this.cacheService
      .eval(COUNT_SCRIPT, [networkKey], [HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS])
      .catch(() => undefined);
  }
}

/** `123456`, `123 456` and `123-456` are all `123456`. Null for anything that isn't six digits. */
export function normalizeVerificationCode(input: string): string | null {
  const digits = String(input ?? '').replace(/\D/g, '');

  return digits.length === 6 ? digits : null;
}

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** The address is the hash tag, so the code, its slots and this network's tries share one Redis Cluster slot. */
export function codeKey(address: string, code: string): string {
  return `human_verify_code:{${address}}:${code}`;
}

function slotsKey(address: string): string {
  return `human_verify_code_slots:{${address}}`;
}

export function slotCounterKey(address: string, payload: HumanVerificationTokenPayload): string {
  const slotId = `${payload.env}:${payload.agentId}:${payload.subscriberId}:${payload.via}:${payload.requestedAt}`;

  return `human_verify_code_slot:{${address}}:${slotId}`;
}

function addressFailuresKey(address: string, network: string): string {
  return `human_verify_code_fail:{${address}}:${network}`;
}

function networkFailuresKey(network: string): string {
  return `human_verify_code_net:{${network}}`;
}

function parsePayload(raw: string): HumanVerificationTokenPayload | null {
  try {
    const payload = JSON.parse(raw) as Partial<HumanVerificationTokenPayload>;
    if (
      !payload?.env ||
      !payload.org ||
      !payload.agentId ||
      !payload.subscriberId ||
      !payload.via ||
      !payload.address ||
      !payload.requestedAt
    ) {
      return null;
    }

    return payload as HumanVerificationTokenPayload;
  } catch {
    return null;
  }
}

function codesUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException('Verification codes are temporarily unavailable. Try again shortly.');
}

function invalidCode(): UnauthorizedException {
  return new UnauthorizedException({
    code: VERIFICATION_CODE_INVALID,
    message: 'That code is wrong or has expired. Check the email, or send a new one.',
  });
}

function tooManyTries(retryAfterSeconds: number): HttpException {
  return new HttpException(
    {
      code: VERIFICATION_CODE_TOO_MANY_TRIES,
      message:
        retryAfterSeconds > 0
          ? 'Too many wrong codes from this network. Wait a few minutes, then try the code from the email.'
          : 'Too many wrong codes. Send a new one.',
      retryAfterSeconds,
    },
    HttpStatus.TOO_MANY_REQUESTS
  );
}
