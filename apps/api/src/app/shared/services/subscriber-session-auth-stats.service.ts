import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { SubscriberSessionAuthMethodEnum } from '@novu/shared';

const DAY_SECONDS = 24 * 60 * 60;
export const SUBSCRIBER_SESSION_STATS_RETENTION_DAYS = 35;
const TTL_SECONDS = SUBSCRIBER_SESSION_STATS_RETENTION_DAYS * DAY_SECONDS;
const MAX_CLIENTS = 100;
const OTHER_CLIENT = 'other';
const FIELD_SEPARATOR = '|';

/**
 * The cap check and both writes must be one script so two writers at the
 * 100-client cap cannot both add a new client. Fallback labels skip the cap so
 * junk headers cannot push them into `other`. The clients set only matters during
 * its own UTC day, so it expires a day after its last write.
 */
const RECORD_SCRIPT = `
local client = ARGV[1]
local field = ARGV[2]
local overflow = ARGV[3]
local maxClients = tonumber(ARGV[4])
local countsTtl = tonumber(ARGV[5])
local clientsTtl = tonumber(ARGV[6])
local capped = ARGV[7] == '1'
if not capped then
  redis.call('HINCRBY', KEYS[1], field, 1)
elseif redis.call('SISMEMBER', KEYS[2], client) == 1 or redis.call('SCARD', KEYS[2]) < maxClients then
  redis.call('SADD', KEYS[2], client)
  redis.call('EXPIRE', KEYS[2], clientsTtl)
  redis.call('HINCRBY', KEYS[1], field, 1)
else
  redis.call('HINCRBY', KEYS[1], overflow, 1)
end
redis.call('EXPIRE', KEYS[1], countsTtl)
return 1
`;

const SESSION_CLIENT_RE = /^@novu\/([a-z0-9-]{1,32})@(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})(?:[-+].*)?$/;

export enum SubscriberSessionSourceEnum {
  INBOX = 'inbox',
  LEGACY_WIDGET = 'legacy-widget',
}

const FALLBACK_CLIENT: Record<SubscriberSessionSourceEnum, string> = {
  [SubscriberSessionSourceEnum.INBOX]: 'unknown',
  [SubscriberSessionSourceEnum.LEGACY_WIDGET]: 'legacy-widget',
};

const AUTH_METHODS = new Set<string>(Object.values(SubscriberSessionAuthMethodEnum));

export interface SubscriberSessionAuthCount {
  authMethod: SubscriberSessionAuthMethodEnum;
  client: string;
  count: number;
}

export interface SubscriberSessionDayCounts {
  /** UTC day, YYYY-MM-DD. */
  day: string;
  counts: SubscriberSessionAuthCount[];
}

export interface RecordSubscriberSessionParams {
  environmentId: string;
  authMethod: SubscriberSessionAuthMethodEnum;
  clientVersion?: string;
  source: SubscriberSessionSourceEnum;
}

@Injectable()
export class SubscriberSessionAuthStatsService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async record(params: RecordSubscriberSessionParams): Promise<void> {
    if (!this.cacheService.cacheEnabled()) {
      return;
    }

    const { authMethod } = params;
    const parsedClient = parseSessionClient(params.clientVersion);
    const client = parsedClient ?? FALLBACK_CLIENT[params.source];

    try {
      const now = new Date();

      await this.cacheService.eval(
        RECORD_SCRIPT,
        [dayKey(params.environmentId, now), clientsKey(params.environmentId, now)],
        [
          client,
          encodeField(authMethod, client),
          encodeField(authMethod, OTHER_CLIENT),
          MAX_CLIENTS,
          TTL_SECONDS,
          DAY_SECONDS,
          parsedClient ? '1' : '0',
        ]
      );
    } catch (err) {
      this.logger.warn(
        { err, environmentId: params.environmentId, authMethod, client },
        'Failed to record subscriber session auth stats'
      );
    }
  }

  /** `null` means the counts are unavailable, which callers must not read as zero sessions. */
  async countLastDays(environmentId: string, days: number): Promise<SubscriberSessionAuthCount[] | null> {
    const byDay = await this.countByDay(environmentId, days);
    if (!byDay) {
      return null;
    }

    const totals = new Map<string, SubscriberSessionAuthCount>();
    for (const { counts } of byDay) {
      for (const row of counts) {
        const key = encodeField(row.authMethod, row.client);
        const total = totals.get(key);
        totals.set(key, total ? { ...total, count: total.count + row.count } : { ...row });
      }
    }

    return [...totals.values()];
  }

  /** One entry per UTC day of the window, newest first; `null` means the counts are unavailable. */
  async countByDay(environmentId: string, days: number): Promise<SubscriberSessionDayCounts[] | null> {
    const client = this.cacheService.client;
    if (!client || !this.cacheService.cacheEnabled()) {
      return null;
    }

    const window = Math.min(SUBSCRIBER_SESSION_STATS_RETENTION_DAYS, Math.max(1, Math.trunc(days) || 1));
    const now = new Date();
    const dates = Array.from({ length: window }, (_, index) => utcDayOffset(now, index));

    let hashes: Record<string, string>[];
    try {
      hashes = await Promise.all(dates.map((date) => client.hgetall(dayKey(environmentId, date))));
    } catch (err) {
      this.logger.warn({ err, environmentId }, 'Failed to read subscriber session auth stats');

      return null;
    }

    return hashes.map((hash, index) => ({
      day: utcDate(dates[index]),
      counts: Object.entries(hash).flatMap(([field, count]) => {
        const decoded = decodeField(field);

        return decoded ? [{ ...decoded, count: Number(count) }] : [];
      }),
    }));
  }
}

function parseSessionClient(clientVersionHeader?: string): string | undefined {
  const match = clientVersionHeader ? SESSION_CLIENT_RE.exec(clientVersionHeader) : null;
  if (!match) {
    return undefined;
  }

  return `@novu/${match[1]}@${match[2]}.${match[3]}.${match[4]}`;
}

function encodeField(authMethod: SubscriberSessionAuthMethodEnum, client: string): string {
  return `${authMethod}${FIELD_SEPARATOR}${client}`;
}

function decodeField(field: string): Omit<SubscriberSessionAuthCount, 'count'> | undefined {
  const separator = field.indexOf(FIELD_SEPARATOR);
  const authMethod = field.slice(0, separator);
  if (separator < 0 || !isAuthMethod(authMethod)) {
    return undefined;
  }

  return { authMethod, client: field.slice(separator + 1) };
}

function isAuthMethod(value: string): value is SubscriberSessionAuthMethodEnum {
  return AUTH_METHODS.has(value);
}

function dayKey(environmentId: string, now: Date): string {
  return `subscriber-session-auth:{${environmentId}}:${utcDate(now)}`;
}

function clientsKey(environmentId: string, now: Date): string {
  return `subscriber-session-auth-clients:{${environmentId}}:${utcDate(now)}`;
}

function utcDate(now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function utcDayOffset(now: Date, daysAgo: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}
