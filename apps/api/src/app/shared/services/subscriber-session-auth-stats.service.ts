import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';

const TTL_SECONDS = 35 * 24 * 60 * 60;
const MAX_FIELDS = 100;
const OTHER_CLIENT = 'other';
const MAX_DAYS = 35;

/**
 * HEXISTS + HLEN + HINCRBY + EXPIRE must be one script so two writers at the
 * 100-field cap cannot both create a new named field.
 */
const RECORD_SCRIPT = `
local field = ARGV[1]
local overflow = ARGV[2]
local maxFields = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])
if redis.call('HEXISTS', KEYS[1], field) == 0 and redis.call('HLEN', KEYS[1]) >= maxFields then
  redis.call('HINCRBY', KEYS[1], overflow, 1)
else
  redis.call('HINCRBY', KEYS[1], field, 1)
end
redis.call('EXPIRE', KEYS[1], ttl)
return 1
`;

const SESSION_CLIENT_RE = /^@novu\/([a-z0-9-]+)@(\d{1,4})\.(\d{1,4})\.(\d{1,4})(?:[-+].*)?$/;

export enum SubscriberSessionAuthMethodEnum {
  HMAC = 'hmac',
  NONE = 'none',
}

export const UNKNOWN_SESSION_CLIENT = 'unknown';
export const LEGACY_WIDGET_SESSION_CLIENT = 'legacy-widget';

export interface SubscriberSessionAuthCount {
  authMethod: SubscriberSessionAuthMethodEnum;
  client: string;
  count: number;
}

export function parseSessionClient(clientVersionHeader?: string): string | undefined {
  if (!clientVersionHeader) {
    return undefined;
  }

  const match = SESSION_CLIENT_RE.exec(clientVersionHeader);
  if (!match) {
    return undefined;
  }

  return `@novu/${match[1]}@${match[2]}.${match[3]}.${match[4]}`;
}

@Injectable()
export class SubscriberSessionAuthStatsService {
  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** Never rejects: a Redis failure is logged at warn and swallowed so session creation is unaffected. */
  async record(params: {
    environmentId: string;
    authMethod: SubscriberSessionAuthMethodEnum;
    client: string;
  }): Promise<void> {
    try {
      if (!this.cacheService.client) {
        return;
      }

      const key = dayKey(params.environmentId, new Date());
      const field = `${params.authMethod}|${params.client}`;
      const overflow = `${params.authMethod}|${OTHER_CLIENT}`;

      await this.cacheService.eval(RECORD_SCRIPT, [key], [field, overflow, MAX_FIELDS, TTL_SECONDS]);
    } catch (err) {
      this.logger.warn(
        { err, environmentId: params.environmentId, authMethod: params.authMethod, client: params.client },
        'Failed to record subscriber session auth stats'
      );
    }
  }

  /** Sums the last `days` UTC days including today, `days` clamped to [1, 35]. Returns [] when the cache client is absent. */
  async countLastDays(environmentId: string, days: number): Promise<SubscriberSessionAuthCount[]> {
    const client = this.cacheService.client;
    if (!client) {
      return [];
    }

    const window = Math.min(MAX_DAYS, Math.max(1, Math.trunc(days) || 1));
    const now = new Date();
    const keys = Array.from({ length: window }, (_, index) => dayKey(environmentId, utcDayOffset(now, index)));

    const hashes = await Promise.all(keys.map((key) => client.hgetall(key)));
    const totals = new Map<string, number>();

    for (const hash of hashes) {
      for (const [field, count] of Object.entries(hash)) {
        totals.set(field, (totals.get(field) ?? 0) + Number(count));
      }
    }

    return [...totals.entries()].map(([field, count]) => {
      const separator = field.indexOf('|');

      return {
        authMethod: field.slice(0, separator) as SubscriberSessionAuthMethodEnum,
        client: field.slice(separator + 1),
        count,
      };
    });
  }
}

function dayKey(environmentId: string, now: Date): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');

  return `subscriber-session-auth:{${environmentId}}:${year}-${month}-${day}`;
}

function utcDayOffset(now: Date, daysAgo: number): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo));
}
