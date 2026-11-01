import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

/** How long a spoken code can be typed. A resend replaces it. */
export const VOICE_VERIFICATION_CODE_TTL_SECONDS = 10 * 60;

export const VOICE_VERIFICATION_CODE_LENGTH = 6;

/** Wrong guesses before the code is burned. A new call is the only way back. */
export const VOICE_VERIFICATION_MAX_ATTEMPTS = 5;

/**
 * One INCR per wrong guess. The first increment arms the TTL, so overlapping
 * guesses cannot read the same count and overwrite each other.
 */
const SPEND_ATTEMPT_SCRIPT = `
local next = redis.call('INCR', KEYS[1])
if next == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return next
`;

/** Deletes the code only when it is still the request this confirmation checked. */
const CLEAR_IF_CURRENT_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then
  return 0
end
local requested = string.match(raw, '"requestedAt":"([^"]+)"')
if requested ~= ARGV[1] then
  return 0
end
redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
return 1
`;

export interface VoiceVerificationCodeKey {
  environmentId: string;
  agentId: string;
  subscriberId: string;
}

export interface IssuedVoiceVerificationCode {
  code: string;
  expiresAt: string;
  /** The code this call replaced, so a rejected dial can put it back. */
  previous: StoredVoiceCode | null;
}

export interface StoredVoiceCode {
  hash: string;
  salt: string;
  address: string;
  requestedAt: string;
  attempts: number;
  expiresAt: string;
}

export type VoiceCodeCheck =
  | { ok: true; address: string; requestedAt: string }
  | { ok: false; reason: 'mismatch'; attemptsRemaining: number }
  | { ok: false; reason: 'locked' | 'missing' };

/**
 * The code a verification call reads. Stored hashed, keyed by the contact,
 * with a wrong-guess counter. The plaintext exists only in the return value
 * of {@link HumanVoiceVerificationCodeService.issue}, which is spoken and not saved.
 */
@Injectable()
export class HumanVoiceVerificationCodeService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async issue(
    key: VoiceVerificationCodeKey,
    params: { address: string; requestedAt: string }
  ): Promise<IssuedVoiceVerificationCode> {
    const previous = await this.read(key);
    const code = randomInt(0, 10 ** VOICE_VERIFICATION_CODE_LENGTH)
      .toString()
      .padStart(VOICE_VERIFICATION_CODE_LENGTH, '0');
    const salt = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + VOICE_VERIFICATION_CODE_TTL_SECONDS * 1000).toISOString();
    const stored: StoredVoiceCode = {
      hash: hashCode(salt, code),
      salt,
      address: params.address,
      requestedAt: params.requestedAt,
      attempts: 0,
      expiresAt,
    };
    await this.writeRecord(key, stored);

    return { code, expiresAt, previous };
  }

  /** Puts a code back after a dial that never left our process. */
  async restore(key: VoiceVerificationCodeKey, stored: StoredVoiceCode): Promise<void> {
    await this.writeRecord(key, stored);
  }

  async check(key: VoiceVerificationCodeKey, code: string): Promise<VoiceCodeCheck> {
    const stored = await this.read(key);
    if (!stored) {
      return { ok: false, reason: 'missing' };
    }

    if (stored.attempts >= VOICE_VERIFICATION_MAX_ATTEMPTS) {
      return { ok: false, reason: 'locked' };
    }

    if (!codesMatch(stored, code)) {
      const attempts = await this.spendAttempt(key, stored.expiresAt);
      if (attempts >= VOICE_VERIFICATION_MAX_ATTEMPTS) {
        return { ok: false, reason: 'locked' };
      }

      return { ok: false, reason: 'mismatch', attemptsRemaining: VOICE_VERIFICATION_MAX_ATTEMPTS - attempts };
    }

    return { ok: true, address: stored.address, requestedAt: stored.requestedAt };
  }

  async clear(key: VoiceVerificationCodeKey): Promise<void> {
    await this.cacheService.del([this.storageKey(key), this.attemptsKey(key)]);
  }

  /** Drops the code when it is still `requestedAt`. A newer resend is left alone. */
  async clearIfCurrent(key: VoiceVerificationCodeKey, requestedAt: string): Promise<void> {
    const removed = await this.cacheService.eval<number>(
      CLEAR_IF_CURRENT_SCRIPT,
      [this.storageKey(key), this.attemptsKey(key)],
      [requestedAt]
    );
    if (removed !== undefined) {
      return;
    }

    const stored = await this.read(key);
    if (!stored || stored.requestedAt === requestedAt) {
      await this.clear(key);
    }
  }

  private async read(key: VoiceVerificationCodeKey): Promise<StoredVoiceCode | null> {
    const raw = await this.cacheService.get(this.storageKey(key));
    if (!raw) {
      return null;
    }

    let stored: StoredVoiceCode;
    try {
      stored = JSON.parse(raw) as StoredVoiceCode;
    } catch {
      return null;
    }

    if (!stored.expiresAt || Date.parse(stored.expiresAt) <= Date.now()) {
      await this.clear(key);

      return null;
    }

    const attemptsRaw = await this.cacheService.get(this.attemptsKey(key));
    const parsedAttempts =
      attemptsRaw === null || attemptsRaw === undefined ? stored.attempts : Number.parseInt(attemptsRaw, 10);

    return { ...stored, attempts: Number.isFinite(parsedAttempts) ? parsedAttempts : stored.attempts };
  }

  private async writeRecord(key: VoiceVerificationCodeKey, stored: StoredVoiceCode): Promise<void> {
    const remainingSeconds = Math.max(1, Math.ceil((Date.parse(stored.expiresAt) - Date.now()) / 1000));
    const written = await this.cacheService.set(this.storageKey(key), JSON.stringify(stored), {
      ttl: remainingSeconds,
    });
    const attemptsWritten = await this.cacheService.set(this.attemptsKey(key), String(stored.attempts), {
      ttl: remainingSeconds,
    });
    if (written === undefined || attemptsWritten === undefined) {
      throw new ServiceUnavailableException({
        code: 'verification_unavailable',
        message: 'Phone verification is unavailable right now. Try again in a moment.',
      });
    }
  }

  private async spendAttempt(key: VoiceVerificationCodeKey, expiresAt: string): Promise<number> {
    const ttl = Math.max(1, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));
    const spent = await this.cacheService.eval<number>(SPEND_ATTEMPT_SCRIPT, [this.attemptsKey(key)], [ttl]);
    if (spent === undefined || spent === null) {
      return VOICE_VERIFICATION_MAX_ATTEMPTS;
    }

    return Number(spent);
  }

  private storageKey(key: VoiceVerificationCodeKey): string {
    return `human_voice_code:{${key.environmentId}:${key.agentId}:${key.subscriberId}}`;
  }

  private attemptsKey(key: VoiceVerificationCodeKey): string {
    return `${this.storageKey(key)}:attempts`;
  }
}

function hashCode(salt: string, code: string): string {
  return createHash('sha256').update(`${salt}:${code}`).digest('hex');
}

function codesMatch(stored: StoredVoiceCode, code: string): boolean {
  const actual = Buffer.from(hashCode(stored.salt, code));
  const expected = Buffer.from(stored.hash);
  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
