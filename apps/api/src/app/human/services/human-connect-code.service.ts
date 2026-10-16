import { randomInt } from 'node:crypto';
import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import type { IApiKey } from '@novu/dal';
import { CLI_USER_CODE_ALPHABET } from '@novu/shared';

/** How long a one-time code connects a host. */
export const CONNECT_CODE_TTL_SECONDS = 10 * 60;

/**
 * Wrong codes one network (client IP) can send for an agent in `CONNECT_CODE_FAILURE_WINDOW_SECONDS`
 * before that network gets none for it, right ones included; and wrong codes one network can send for any
 * agents together. They are counted per network, so a stranger who knows an agent's handle can't lock its
 * host out. What stops guessing is the code itself: eight letters out of twenty (2.6e10 of them) that work
 * for ten minutes.
 */
export const CONNECT_CODE_MAX_FAILURES = 10;
export const CONNECT_CODE_MAX_FAILURES_PER_NETWORK = 30;
export const CONNECT_CODE_FAILURE_WINDOW_SECONDS = 10 * 60;

/** A code is still known this long after it ran out or was used, so a late try is told which of the two it was. */
const CONNECT_CODE_KEPT_SECONDS = 60 * 60;

/** A code the dashboard asks for again is handed out again while it has at least this long left. */
const CONNECT_CODE_REUSE_MIN_SECONDS = 2 * 60;

const CODE_ATTEMPTS = 5;

/** Machine-readable codes on the errors, so the CLI and the dashboard can tell them apart. */
export const CONNECT_CODE_INVALID = 'connect_code_invalid';
export const CONNECT_CODE_EXPIRED = 'connect_code_expired';
export const CONNECT_CODE_USED = 'connect_code_used';
export const CONNECT_CODE_TOO_MANY_TRIES = 'connect_code_too_many_tries';

/** What an agent is called in `agentinbox connect <agent>`: the part of its address before the `@`. */
export const AGENT_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const AGENT_HANDLE_MAX_LENGTH = 32;

/** The agent a code connects to, and the environment that holds it. */
export type ConnectCodeTarget = {
  environmentId: string;
  organizationId: string;
  agentId: string;
  agentIdentifier: string;
  handle: string;
  /** Which of the environment's keys was current when the code was made (`keyFingerprint`). */
  keyFingerprint: string;
};

type ConnectCodeRecord = ConnectCodeTarget & {
  /** Epoch seconds. Whole seconds keep the number exact through Redis's Lua JSON. */
  expiresAt: number;
  usedAt?: number;
};

export type IssuedConnectCode = { code: string; handle: string; expiresAt: string };

/**
 * What became of a code: `unused` while it can still connect a host, `used` once a host connected with it,
 * `expired` once it ran out, or once the account's key changed after it was made.
 */
export type ConnectCodeStatus = 'unused' | 'used' | 'expired';

export type ConnectCodeState = {
  code: string;
  status: ConnectCodeStatus;
  expiresAt: string;
  /** When a host used it. Only on a `used` code. */
  usedAt?: string;
};

/** Who asks about a code: the agent, its environment, and the key that environment has now (`keyFingerprint`). */
export type ConnectCodeOwner = Pick<
  ConnectCodeTarget,
  'environmentId' | 'organizationId' | 'agentId' | 'keyFingerprint'
>;

/**
 * Takes the code once: refuses every try while this network has sent too many wrong ones for the agent,
 * counts a wrong one, and marks a right one used, keeping it around so a second try is told it was used.
 * KEYS: the code, this network's wrong tries for the agent. ARGV: now (epoch seconds), max wrong tries,
 * their window, how long a code is kept.
 */
const REDEEM_SCRIPT = `
local failures = tonumber(redis.call('get', KEYS[2]) or '0')
if failures >= tonumber(ARGV[2]) then return 'TOO_MANY_TRIES' end
local v = redis.call('get', KEYS[1])
local ok, payload = false, nil
if v then ok, payload = pcall(cjson.decode, v) end
if not ok then
  local n = redis.call('incr', KEYS[2])
  if n == 1 then redis.call('expire', KEYS[2], ARGV[3]) end
  return 'INVALID'
end
if payload.usedAt then return 'USED' end
if tonumber(payload.expiresAt) <= tonumber(ARGV[1]) then return 'EXPIRED' end
payload.usedAt = tonumber(ARGV[1])
local ttl = redis.call('ttl', KEYS[1])
if ttl < 1 then ttl = tonumber(ARGV[4]) end
redis.call('setex', KEYS[1], ttl, cjson.encode(payload))
return v
`;

/**
 * One-time codes that connect a host to an Agent Inbox agent: the dashboard asks for one, and
 * `agentinbox connect <agent> --code <code>` trades it for the key `login` would have saved. A code is
 * kept with the agent's address part (its handle), so a guess has to name the agent too, and every agent
 * takes only so many wrong codes at a time.
 */
@Injectable()
export class HumanConnectCodeService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** The agent's code for this handle. One it got a moment ago comes back while it is unused and has time left. */
  async issue(target: ConnectCodeTarget): Promise<IssuedConnectCode> {
    if (!this.cacheService.cacheEnabled()) {
      this.logger.warn('Cache unavailable — cannot issue an Agent Inbox connect code');

      throw codesUnavailable();
    }

    const current = await this.findReusable(target);
    if (current) {
      return current;
    }

    const expiresAt = Math.floor(Date.now() / 1000) + CONNECT_CODE_TTL_SECONDS;
    const record: ConnectCodeRecord = { ...target, expiresAt };

    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const code = generateCode();
      const reserved = await this.cacheService.setIfNotExist(
        connectCodeKey(target.handle, code),
        JSON.stringify(record),
        {
          ttl: CONNECT_CODE_KEPT_SECONDS,
          jitter: false,
        }
      );

      if (reserved === 'OK') {
        await this.cacheService.set(currentCodeKey(target.agentId), code, {
          ttl: CONNECT_CODE_TTL_SECONDS,
          jitter: false,
        });

        return { code, handle: target.handle, expiresAt: toIso(expiresAt) };
      }
    }

    throw new Error('Could not issue a unique Agent Inbox connect code');
  }

  /**
   * Uses the code: what it connects to, once. Throws a 404 for a code that never existed (or names another
   * agent), a 410 for one that ran out, a 409 for one used before and a 429 while the agent takes no codes.
   */
  async redeem(handleInput: string, codeInput: string, clientIp?: string): Promise<ConnectCodeTarget> {
    const handle = normalizeHandle(handleInput);
    const code = normalizeCode(codeInput);

    if (!handle || !code) {
      throw invalidCode();
    }

    if (!this.cacheService.cacheEnabled()) {
      throw codesUnavailable();
    }

    const network = clientIp?.trim() || 'unknown';
    const networkKey = networkFailuresKey(network);
    if (Number(await this.cacheService.get(networkKey)) >= CONNECT_CODE_MAX_FAILURES_PER_NETWORK) {
      throw tooManyTries();
    }

    const result = await this.cacheService.eval<string | null>(
      REDEEM_SCRIPT,
      [connectCodeKey(handle, code), failuresKey(handle, network)],
      [
        Math.floor(Date.now() / 1000),
        CONNECT_CODE_MAX_FAILURES,
        CONNECT_CODE_FAILURE_WINDOW_SECONDS,
        CONNECT_CODE_KEPT_SECONDS,
      ]
    );

    if (result === 'INVALID') {
      await this.cacheService.eval(COUNT_SCRIPT, [networkKey], [CONNECT_CODE_FAILURE_WINDOW_SECONDS]);
    }

    switch (result) {
      case 'TOO_MANY_TRIES':
        throw tooManyTries();
      case 'USED':
        throw new ConflictException({
          message: 'This code was used already, and each code works once. Ask for a new one on agentinbox.md.',
          code: CONNECT_CODE_USED,
        });
      case 'EXPIRED':
        throw new GoneException({
          message: 'This code ran out: codes work for 10 minutes. Ask for a new one on agentinbox.md.',
          code: CONNECT_CODE_EXPIRED,
        });
      default: {
        const record = result && result !== 'INVALID' ? parseRecord(result) : null;
        if (!record) {
          throw invalidCode();
        }

        return {
          environmentId: record.environmentId,
          organizationId: record.organizationId,
          agentId: record.agentId,
          agentIdentifier: record.agentIdentifier,
          handle: record.handle,
          keyFingerprint: record.keyFingerprint,
        };
      }
    }
  }

  /**
   * What became of one of the agent's codes, for the dashboard that shows it. It only reads: asking is not a
   * try, and the code stays as it was. Null for a code never made under this handle, one let go since (an
   * hour after it was made), and one of another agent's, so nothing shows of codes that aren't the owner's.
   */
  async describe(owner: ConnectCodeOwner, handleInput: string, codeInput: string): Promise<ConnectCodeState | null> {
    const handle = normalizeHandle(handleInput);
    const code = normalizeCode(codeInput);

    if (!handle || !code) {
      return null;
    }

    if (!this.cacheService.cacheEnabled()) {
      throw codesUnavailable();
    }

    const raw = await this.cacheService.get(connectCodeKey(handle, code));
    const record = raw ? parseRecord(raw) : null;

    if (
      !record ||
      record.agentId !== owner.agentId ||
      record.environmentId !== owner.environmentId ||
      record.organizationId !== owner.organizationId
    ) {
      return null;
    }

    const status = statusOf(record, owner.keyFingerprint);

    return {
      code,
      status,
      expiresAt: toIso(record.expiresAt),
      ...(status === 'used' && record.usedAt ? { usedAt: toIso(record.usedAt) } : {}),
    };
  }

  private async findReusable(target: ConnectCodeTarget): Promise<IssuedConnectCode | null> {
    const code = await this.cacheService.get(currentCodeKey(target.agentId));
    const raw = code ? await this.cacheService.get(connectCodeKey(target.handle, code)) : null;
    const record = raw ? parseRecord(raw) : null;

    if (
      !code ||
      !record ||
      record.usedAt ||
      record.agentId !== target.agentId ||
      record.environmentId !== target.environmentId ||
      // Made with a key that was replaced since, it can't connect anything (`ConnectHost`).
      record.keyFingerprint !== target.keyFingerprint ||
      record.expiresAt - Math.floor(Date.now() / 1000) < CONNECT_CODE_REUSE_MIN_SECONDS
    ) {
      return null;
    }

    return { code, handle: target.handle, expiresAt: toIso(record.expiresAt) };
  }
}

/** `Atlas`, ` atlas ` and `atlas@agentinbox.md` all name the agent `atlas`. Null for what can't be a handle. */
export function normalizeHandle(input: string): string | null {
  const handle = String(input ?? '')
    .trim()
    .toLowerCase()
    .split('@')[0];

  return handle.length <= AGENT_HANDLE_MAX_LENGTH && AGENT_HANDLE_PATTERN.test(handle) ? handle : null;
}

/** `bcdfghjk`, `BCDF GHJK` and `bcdf-ghjk` are all `BCDF-GHJK`. Null for what can't be a code. */
export function normalizeCode(input: string): string | null {
  const letters = String(input ?? '')
    .toUpperCase()
    .replace(/[\s-]/g, '');

  if (letters.length !== 8 || [...letters].some((letter) => !CLI_USER_CODE_ALPHABET.includes(letter))) {
    return null;
  }

  return `${letters.slice(0, 4)}-${letters.slice(4)}`;
}

/** Eight consonants like a `login` code, e.g. `BCDF-GHJK`: they never spell words and can't be misread. */
function generateCode(): string {
  const letters = Array.from({ length: 8 }, () => CLI_USER_CODE_ALPHABET[randomInt(CLI_USER_CODE_ALPHABET.length)]);

  return `${letters.slice(0, 4).join('')}-${letters.slice(4).join('')}`;
}

/** The handle is the hash tag, so a code and its agent's wrong tries share one Redis Cluster slot for the script. */
export function connectCodeKey(handle: string, code: string): string {
  return `agent-inbox-connect:{${handle}}:code:${code}`;
}

/** One network's wrong tries for one agent, in the agent's slot so the script can count them. */
function failuresKey(handle: string, network: string): string {
  return `agent-inbox-connect:{${handle}}:failures:${network}`;
}

/** One network's wrong tries for any agents together: a key of its own, counted outside the script. */
function networkFailuresKey(network: string): string {
  return `agent-inbox-connect-network:{${network}}:failures`;
}

/** Counts one more on a key that runs out `ARGV[1]` seconds after its first count. */
const COUNT_SCRIPT = `
local n = redis.call('incr', KEYS[1])
if n == 1 then redis.call('expire', KEYS[1], ARGV[1]) end
return n
`;

/**
 * Which key an environment has right now, without the key itself: a code remembers it, so a code made
 * with a key that was replaced since can't hand out the new one. It is the start of the hash Novu already
 * keeps of every key to look it up by. A key from before keys had a hash has none, so it reads as empty,
 * and every key that replaces it has one.
 */
export function keyFingerprint(apiKey: Pick<IApiKey, 'hash'> | undefined): string {
  return apiKey?.hash?.slice(0, 32) ?? '';
}

function currentCodeKey(agentId: string): string {
  return `agent-inbox-connect-current:${agentId}`;
}

function parseRecord(raw: string): ConnectCodeRecord | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ConnectCodeRecord>;

    if (
      !parsed?.environmentId ||
      !parsed.organizationId ||
      !parsed.agentId ||
      !parsed.handle ||
      !parsed.expiresAt ||
      typeof parsed.keyFingerprint !== 'string'
    ) {
      return null;
    }

    return parsed as ConnectCodeRecord;
  } catch {
    return null;
  }
}

/**
 * As `connect` would find the code: one made with a key that was replaced since ran out, whether or not it
 * was used before that (the host it connected was cut off with the old key). Otherwise a used one stays
 * used past its end, as it can only be used while it works.
 */
function statusOf(record: ConnectCodeRecord, currentKeyFingerprint: string): ConnectCodeStatus {
  if (record.keyFingerprint !== currentKeyFingerprint) {
    return 'expired';
  }

  if (record.usedAt) {
    return 'used';
  }

  return record.expiresAt <= Math.floor(Date.now() / 1000) ? 'expired' : 'unused';
}

function toIso(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString();
}

function codesUnavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException('One-time codes are not available right now. Try again in a moment.');
}

function invalidCode(): NotFoundException {
  return new NotFoundException({
    message:
      'No agent has this code. Check the agent and the code you were given, or ask for a new code on agentinbox.md.',
    code: CONNECT_CODE_INVALID,
  });
}

function tooManyTries(): HttpException {
  return new HttpException(
    {
      message:
        'Too many wrong codes came from this network. Wait 10 minutes, then try again with a new code from agentinbox.md.',
      code: CONNECT_CODE_TOO_MANY_TRIES,
      retryAfterSeconds: CONNECT_CODE_FAILURE_WINDOW_SECONDS,
    },
    HttpStatus.TOO_MANY_REQUESTS
  );
}
