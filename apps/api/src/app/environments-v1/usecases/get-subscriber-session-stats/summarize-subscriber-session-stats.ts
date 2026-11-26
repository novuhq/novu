import { SubscriberSessionAuthMethodEnum } from '@novu/shared';
import type { SubscriberSessionDayCounts } from '../../../shared/services/subscriber-session-auth-stats.service';
import type {
  SubscriberSessionClientStatsDto,
  SubscriberSessionStatsResponseDto,
} from '../../dtos/subscriber-session-stats.dto';

/** `byDay` is newest first, so a day's index is how many days ago it was. */
export function summarizeSubscriberSessionStats(
  days: number,
  byDay: SubscriberSessionDayCounts[] | null
): SubscriberSessionStatsResponseDto {
  if (!byDay) {
    return { days, available: false, clients: [] };
  }

  const clients = new Map<string, SubscriberSessionClientStatsDto>();
  byDay.forEach(({ counts }, daysAgo) => {
    for (const { authMethod, client, count } of counts) {
      const row = clients.get(client) ?? { client, token: 0, withoutToken: 0, lastSeenWithoutTokenDaysAgo: null };
      if (authMethod === SubscriberSessionAuthMethodEnum.TOKEN) {
        row.token += count;
      } else {
        row.withoutToken += count;
        row.lastSeenWithoutTokenDaysAgo = Math.min(row.lastSeenWithoutTokenDaysAgo ?? daysAgo, daysAgo);
      }
      clients.set(client, row);
    }
  });

  return {
    days,
    available: true,
    clients: [...clients.values()].sort(
      (a, b) => b.withoutToken - a.withoutToken || b.token - a.token || a.client.localeCompare(b.client)
    ),
  };
}
