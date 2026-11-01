import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

/** How long a spoken code can be typed. A resend replaces it. */
export const VOICE_VERIFICATION_CODE_TTL_SECONDS = 10 * 60;

export const VOICE_VERIFICATION_CODE_LENGTH = 6;

/** Wrong guesses before the code is burned. A new call is the only way back. */
export const VOICE_VERIFICATION_MAX_ATTEMPTS = 5;

export interface VoiceVerificationCodeKey {
  environmentId: string;
  agentId: string;
  subscriberId: string;
}

export interface IssuedVoiceVerificationCode {
  code: string;
  expiresAt: string;
}

interface StoredVoiceCode {
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
    const written = await this.cacheService.set(this.storageKey(key), JSON.stringify(stored), {
      ttl: VOICE_VERIFICATION_CODE_TTL_SECONDS,
    });
    if (written === undefined) {
      throw new ServiceUnavailableException({
        code: 'verification_unavailable',
        message: 'Phone verification is unavailable right now. Try again in a moment.',
      });
    }

    return { code, expiresAt };
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
      const attempts = stored.attempts + 1;
      await this.write(key, { ...stored, attempts });
      if (attempts >= VOICE_VERIFICATION_MAX_ATTEMPTS) {
        return { ok: false, reason: 'locked' };
      }

      return { ok: false, reason: 'mismatch', attemptsRemaining: VOICE_VERIFICATION_MAX_ATTEMPTS - attempts };
    }

    return { ok: true, address: stored.address, requestedAt: stored.requestedAt };
  }

  async clear(key: VoiceVerificationCodeKey): Promise<void> {
    await this.cacheService.del(this.storageKey(key));
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

    return stored;
  }

  private async write(key: VoiceVerificationCodeKey, stored: StoredVoiceCode): Promise<void> {
    const remainingSeconds = Math.max(1, Math.ceil((Date.parse(stored.expiresAt) - Date.now()) / 1000));
    await this.cacheService.set(this.storageKey(key), JSON.stringify(stored), { ttl: remainingSeconds });
  }

  private storageKey(key: VoiceVerificationCodeKey): string {
    return `human_voice_code:{${key.environmentId}:${key.agentId}:${key.subscriberId}}`;
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
