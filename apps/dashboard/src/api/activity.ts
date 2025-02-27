import { IActivity, IEnvironment } from '@novu/shared';
import { get } from './api.client';

export type ActivityFilters = {
  channels?: string[];
  workflows?: string[];
  email?: string;
  subscriberId?: string;
  transactionId?: string;
  dateRange?: string;
};

export interface ActivityResponse {
  data: IActivity[];
  hasMore: boolean;
  pageSize: number;
}

export function getActivityList({
  environment,
  page,
  limit,
  filters,
  signal,
}: {
  environment: IEnvironment;
  page: number;
  limit: number;
  filters?: ActivityFilters;
  signal?: AbortSignal;
}): Promise<ActivityResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('page', page.toString());
  searchParams.append('limit', limit.toString());

  if (filters?.channels?.length) {
    filters.channels.forEach((channel) => {
      searchParams.append('channels', channel);
    });
  }

  if (filters?.workflows?.length) {
    filters.workflows.forEach((workflow) => {
      searchParams.append('templates', workflow);
    });
  }

  if (filters?.email) {
    searchParams.append('emails', filters.email);
  }

  if (filters?.subscriberId) {
    searchParams.append('subscriberIds', filters.subscriberId);
  }

  if (filters?.transactionId) {
    searchParams.append('transactionId', filters.transactionId);
  }

  if (filters?.dateRange) {
    const after = new Date(Date.now() - getDateRangeInDays(filters?.dateRange) * 24 * 60 * 60 * 1000);
    searchParams.append('after', after.toISOString());
  }

  return get<ActivityResponse>(`/notifications?${searchParams.toString()}`, {
    environment,
    signal,
  });
}

function getDateRangeInDays(range: string): number {
  switch (range) {
    case '24h':
      return 1;
    case '7d':
      return 7;
    case '30d':
    default:
      return 30;
  }
}

export async function getNotification(notificationId: string, environment: IEnvironment): Promise<IActivity> {
  const { data } = await get<{ data: IActivity }>(`/notifications/${notificationId}`, {
    environment,
  });

  return data;
}
