import { randomInt } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { CLI_USER_CODE_ALPHABET } from '@novu/shared';

/** How long a code binds a WhatsApp number. */
export const WHATSAPP_BIND_CODE_TTL_SECONDS = 10 * 60;

/**
 * Wrong codes one WhatsApp number can send to one business number in `WHATSAPP_BIND_CODE_FAILURE_WINDOW_SECONDS`
 * before it gets none, right ones included. What stops guessing is the code itself: eight letters out of twenty
 * (2.6e10 of them) that work for ten minutes, each guess a WhatsApp message.
 */
export const WHATSAPP_BIND_CODE_MAX_FAILURES = 10;
export const WHATSAPP_BIND_CODE_FAILURE_WINDOW_SECONDS = 10 * 60;

const CODE_LENGTH = 8;
const CODE_ATTEMPTS = 5;
const CODE_KEY_PREFIX = 'agent-inbox-whatsapp-code';
const FAILURE_KEY_PREFIX = 'agent-inbox-whatsapp-code-failures';

/**
 * A code as a person sees or types it, `BCDF-GHJK`: eight letters of the CLI's alphabet (no vowels, no lookalikes),
 * the dash optional, any case. Word boundaries keep it from matching inside longer words.
 */
const CODE_LETTER = `[${CLI_USER_CODE_ALPHABET}]`;
const CODE_PATTERN = new RegExp(`(?:^|[^A-Z0-9])(${CODE_LETTER}{4})-?(${CODE_LETTER}{4})(?![A-Z0-9])`, 'i');

/** Who a code binds, and on which business number of whose relay. */
export type WhatsAppBindCodePayload = {
  environmentId: string;
  organizationId: string;
  integrationId: string;
  agentIdentifier: string;
  subscriberId: string;
};

export type ConsumeWhatsAppBindCodeResult =
  | { status: 'consumed'; payload: WhatsAppBindCodePayload }
  | { status: 'missing' }
  | { status: 'too_many_tries' };

/** GET and DEL in one step, so a code binds once however many messages carry it. */
const CONSUME_SCRIPT = `
local v = redis.call('get', KEYS[1])
if v then redis.call('del', KEYS[1]) end
return v
`;

/** Counts a wrong code; the window starts with the first. */
const COUNT_FAILURE_SCRIPT = `
local n = redis.call('incr', KEYS[1])
if n == 1 then redis.call('expire', KEYS[1], ARGV[1]) end
return n
`;

/** The code in a WhatsApp message, upper-cased and without the dash, or `null` when it holds none. */
export function extractWhatsAppBindCode(text: string | undefined): string | null {
  if (!text) {
    return null;
  }

  const match = CODE_PATTERN.exec(text);

  return match ? `${match[1]}${match[2]}`.toUpperCase() : null;
}

/** How a code is shown and pre-filled: `BCDF-GHJK`. */
export function formatWhatsAppBindCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * The one-time codes that prove a WhatsApp number, the WhatsApp answer to Telegram's `/start`. A person sends one
 * to the relay's business number, which proves the number is theirs and opens the 24-hour window in one move.
 * Codes are keyed by the business number's integration, so one only works on the number it was made for.
 */
@Injectable()
export class WhatsAppBindCodeService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async issue(payload: WhatsAppBindCodePayload): Promise<{ code: string; expiresAt: string }> {
    if (!this.cacheService.cacheEnabled()) {
      throw new ServiceUnavailableException({
        code: 'whatsapp_code_unavailable',
        message: 'WhatsApp codes can’t be made right now. Try again in a moment.',
      });
    }

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
      const code = mintCode();
      const stored = await this.cacheService.setIfNotExist(
        codeKey(payload.integrationId, code),
        JSON.stringify(payload),
        // No jitter: the code must live exactly as long as the `expiresAt` handed out with it.
        { ttl: WHATSAPP_BIND_CODE_TTL_SECONDS, jitter: false }
      );

      if (stored) {
        return {
          code: formatWhatsAppBindCode(code),
          expiresAt: new Date(Date.now() + WHATSAPP_BIND_CODE_TTL_SECONDS * 1000).toISOString(),
        };
      }
    }

    throw new ServiceUnavailableException({
      code: 'whatsapp_code_unavailable',
      message: 'WhatsApp codes can’t be made right now. Try again in a moment.',
    });
  }

  /**
   * Uses up the code a sender wrote to a business number. A code that isn't there counts against the sender, and
   * one who has guessed too often gets nothing back until the window passes.
   */
  async consume(integrationId: string, code: string, sender: string): Promise<ConsumeWhatsAppBindCodeResult> {
    if (!this.cacheService.cacheEnabled()) {
      return { status: 'missing' };
    }

    const failuresKey = `${FAILURE_KEY_PREFIX}:${integrationId}:${sender}`;

    try {
      if (Number(await this.cacheService.get(failuresKey)) >= WHATSAPP_BIND_CODE_MAX_FAILURES) {
        return { status: 'too_many_tries' };
      }

      const raw = await this.cacheService.eval<string | null>(CONSUME_SCRIPT, [codeKey(integrationId, code)], []);
      const payload = raw ? parsePayload(raw) : null;
      if (payload && payload.integrationId === integrationId) {
        return { status: 'consumed', payload };
      }

      await this.cacheService.eval(COUNT_FAILURE_SCRIPT, [failuresKey], [WHATSAPP_BIND_CODE_FAILURE_WINDOW_SECONDS]);
    } catch (err) {
      this.logger.warn(`Failed to consume a WhatsApp code: ${(err as Error).message}`);
    }

    return { status: 'missing' };
  }
}

function mintCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CLI_USER_CODE_ALPHABET[randomInt(CLI_USER_CODE_ALPHABET.length)];
  }

  return code;
}

function codeKey(integrationId: string, code: string): string {
  return `${CODE_KEY_PREFIX}:${integrationId}:${code}`;
}

function parsePayload(raw: string): WhatsAppBindCodePayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WhatsAppBindCodePayload>;
    if (
      typeof parsed.environmentId === 'string' &&
      typeof parsed.organizationId === 'string' &&
      typeof parsed.integrationId === 'string' &&
      typeof parsed.agentIdentifier === 'string' &&
      typeof parsed.subscriberId === 'string'
    ) {
      return parsed as WhatsAppBindCodePayload;
    }
  } catch {
    // An unreadable code is no code.
  }

  return null;
}
