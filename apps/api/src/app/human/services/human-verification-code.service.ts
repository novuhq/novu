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

/**
 * Wrong codes one network can send for one address, and for any addresses together, in
 * {@link HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS}. Past the address cap, that network
 * gets no further try at the address, right codes included. A different network is unaffected,
 * so a stranger who knows the inbox cannot lock its code. Copied from the connect-code caps.
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
 * Takes the code once, or counts a wrong one for this network only.
 * The cap is checked before a live code is accepted, so this network cannot keep guessing
 * until one lands. Nothing here is shared with another network or another code, and a wrong,
 * expired, or unknown code is the same outcome.
 * KEYS: the code, this network's wrong tries for the address.
 * ARGV: now (epoch seconds), max wrong tries, their window.
 * Returns OK/USED plus the payload JSON, INVALID, BLOCKED (the cap was already hit), or TOO_MANY.
 */
const REDEEM_SCRIPT = `
local maxFails = tonumber(ARGV[2])
local fails = tonumber(redis.call('GET', KEYS[2]) or '0')
if fails >= maxFails then return 'BLOCKED' end

local raw = redis.call('GET', KEYS[1])
local ok, record = false, nil
if raw then ok, record = pcall(cjson.decode, raw) end
if ok and record and record.payload and tonumber(record.expiresAt) > tonumber(ARGV[1]) then
  local payload = cjson.encode(record.payload)
  if record.usedAt then return 'USED' .. payload end
  record.usedAt = tonumber(ARGV[1])
  local ttl = redis.call('TTL', KEYS[1])
  if ttl < 1 then ttl = 1 end
  redis.call('SETEX', KEYS[1], ttl, cjson.encode(record))
  return 'OK' .. payload
end

local n = redis.call('INCR', KEYS[2])
if n == 1 then redis.call('EXPIRE', KEYS[2], ARGV[3]) end
if n >= maxFails then return 'TOO_MANY' end
return 'INVALID'
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
    const record: StoredCode = { payload: { ...payload, address }, expiresAt };

    for (let attempt = 0; attempt < CODE_ISSUE_ATTEMPTS; attempt++) {
      const code = generateCode();
      const reserved = await this.cacheService.setIfNotExist(codeKey(address, code), JSON.stringify(record), {
        ttl: HUMAN_VERIFICATION_LINK_TTL_SECONDS,
        jitter: false,
      });

      if (reserved === 'OK') {
        return { code, expiresAt: new Date(expiresAt * 1000).toISOString() };
      }
    }

    throw new Error('Could not issue a unique Human verification code');
  }

  /**
   * Uses the code once. A wrong, expired, or unknown code is the same invalid error.
   * Ten wrong tries from one network stop that network; every other network, and the link, keep working.
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
      throw tooManyTries();
    }

    let result: string | null;
    try {
      result = await this.cacheService.eval<string | null>(
        REDEEM_SCRIPT,
        [codeKey(address, code), addressFailuresKey(address, network)],
        [
          Math.floor(Date.now() / 1000),
          HUMAN_VERIFICATION_CODE_MAX_ADDRESS_FAILURES,
          HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS,
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

    if (result === 'BLOCKED' || result === 'TOO_MANY') {
      if (result === 'TOO_MANY') {
        await this.countNetwork(networkKey);
      }

      throw tooManyTries();
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

/** The address is the hash tag, so the code and this network's tries share one Redis Cluster slot. */
export function codeKey(address: string, code: string): string {
  return `human_verify_code:{${address}}:${code}`;
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

function tooManyTries(): HttpException {
  return new HttpException(
    {
      code: VERIFICATION_CODE_TOO_MANY_TRIES,
      message: 'Too many wrong codes from this network. Wait a few minutes, then try the code from the email.',
      retryAfterSeconds: HUMAN_VERIFICATION_CODE_FAILURE_WINDOW_SECONDS,
    },
    HttpStatus.TOO_MANY_REQUESTS
  );
}
