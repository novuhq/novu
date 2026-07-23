import { getDateRangeInMs, type IActivity, type IEnvironment, SeverityLevelEnum } from '@novu/shared';
import { get } from './api.client';

export type ActivityFilters = {
  channels?: string[];
  workflows?: string[];
  email?: string;
  subscriberId?: string;
  transactionId?: string;
  dateRange?: string;
  topicKey?: string;
  subscriptionId?: string;
  severity?: SeverityLevelEnum[];
  contextKeys?: string[];
};

export interface ActivityResponse {
  data: IActivity[];
  hasMore: boolean;
  pageSize: number;
  next?: string | null;
  previous?: string | null;
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
    for (const channel of filters.channels) {
      searchParams.append('channels', channel);
    }
  }

  if (filters?.severity?.length) {
    for (const severity of filters.severity) {
      searchParams.append('severity', severity);
    }
  }

  if (filters?.workflows?.length) {
    for (const workflow of filters.workflows) {
      searchParams.append('templates', workflow);
    }
  }

  if (filters?.email) {
    searchParams.append('emails', filters.email);
  }

  if (filters?.subscriberId) {
    searchParams.append('subscriberIds', filters.subscriberId);
  }

  if (filters?.transactionId) {
    // Parse comma-delimited string into array for backend
    const transactionIds = filters.transactionId
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionIds.length > 1) {
      for (const id of transactionIds) {
        searchParams.append('transactionId', id);
      }
    } else {
      searchParams.append('transactionId', filters.transactionId);
    }
  }

  if (filters?.topicKey) {
    searchParams.append('topicKey', filters.topicKey);
  }

  if (filters?.subscriptionId) {
    searchParams.append('subscriptionId', filters.subscriptionId);
  }

  if (filters?.contextKeys?.length) {
    for (const key of filters.contextKeys) {
      searchParams.append('contextKeys', key);
    }
  }

  if (filters?.dateRange) {
    const after = new Date(Date.now() - getDateRangeInMs(filters?.dateRange));
    searchParams.append('after', after.toISOString());
  }

  return get<ActivityResponse>(`/notifications?${searchParams.toString()}`, {
    environment,
    signal,
  });
}

export async function getNotification(notificationId: string, environment: IEnvironment): Promise<IActivity> {
  const { data } = await get<{ data: IActivity }>(`/notifications/${notificationId}`, {
    environment,
  });

  return data;
}

export type WorkflowRunsCountPeriod = {
  start: string;
  end: string;
};

export async function getWorkflowRunsCount({
  environment,
  filters,
  period,
  signal,
}: {
  environment: IEnvironment;
  filters?: ActivityFilters;
  period?: WorkflowRunsCountPeriod;
  signal?: AbortSignal;
}): Promise<number> {
  let createdAtGte: string | undefined;
  let createdAtLte: string | undefined;
  let workflowIds: string[] | undefined;
  let subscriberIds: string[] | undefined;
  let transactionIds: string[] | undefined;
  let channels: string[] | undefined;
  let topicKey: string | undefined;

  if (filters?.channels?.length) {
    channels = filters.channels;
  }

  if (filters?.topicKey) {
    topicKey = filters.topicKey;
  }

  if (filters?.workflows?.length) {
    workflowIds = filters.workflows;
  }

  if (filters?.subscriberId) {
    subscriberIds = [filters.subscriberId];
  }

  if (filters?.transactionId) {
    transactionIds = filters.transactionId
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  if (period) {
    createdAtGte = period.start;
    createdAtLte = period.end;
  } else if (filters?.dateRange) {
    const after = new Date(Date.now() - getDateRangeInMs(filters?.dateRange));
    createdAtGte = after.toISOString();
  }

  const response = await getCharts({
    environment,
    createdAtGte,
    createdAtLte,
    reportType: [ReportTypeEnum.WORKFLOW_RUNS_COUNT],
    workflowIds,
    subscriberIds,
    transactionIds,
    channels,
    topicKey,
    signal,
  });

  const countData = response.data[ReportTypeEnum.WORKFLOW_RUNS_COUNT] as WorkflowRunsCountDataPoint;
  return countData?.count ?? 0;
}

// Charts API types and functions
export enum ReportTypeEnum {
  DELIVERY_TREND = 'delivery-trend',
  INTERACTION_TREND = 'interaction-trend',
  WORKFLOW_BY_VOLUME = 'workflow-by-volume',
  PROVIDER_BY_VOLUME = 'provider-by-volume',
  MESSAGES_DELIVERED = 'messages-delivered',
  ACTIVE_SUBSCRIBERS = 'active-subscribers',
  AVG_MESSAGES_PER_SUBSCRIBER = 'avg-messages-per-subscriber',
  WORKFLOW_RUNS_METRIC = 'workflow-runs-metric',
  TOTAL_INTERACTIONS = 'total-interactions',
  WORKFLOW_RUNS_TREND = 'workflow-runs-trend',
  ACTIVE_SUBSCRIBERS_TREND = 'active-subscribers-trend',
  WORKFLOW_RUNS_COUNT = 'workflow-runs-count',
}

export type ChartDataPoint = {
  timestamp: string;
  inApp: number;
  email: number;
  sms: number;
  chat: number;
  push: number;
};

export type InteractionTrendDataPoint = {
  timestamp: string;
  messageSeen: number;
  messageRead: number;
  messageSnoozed: number;
  messageArchived: number;
};

export type WorkflowVolumeDataPoint = {
  workflowName: string;
  count: number;
};

export type ProviderVolumeDataPoint = {
  providerId: string;
  count: number;
};

export type MessagesDeliveredDataPoint = {
  currentPeriod: number;
  previousPeriod: number;
};

export type ActiveSubscribersDataPoint = {
  currentPeriod: number;
  previousPeriod: number;
};

export type AvgMessagesPerSubscriberDataPoint = {
  currentPeriod: number;
  previousPeriod: number;
};

export type WorkflowRunsMetricDataPoint = {
  currentPeriod: number;
  previousPeriod: number;
};

export type TotalInteractionsDataPoint = {
  currentPeriod: number;
  previousPeriod: number;
};

export type WorkflowRunsTrendDataPoint = {
  timestamp: string;
  processing: number;
  completed: number;
  error: number;
};

export type ActiveSubscribersTrendDataPoint = {
  timestamp: string;
  count: number;
};

export type WorkflowRunsCountDataPoint = {
  count: number;
};

export type GetChartsRequest = {
  createdAtGte?: string;
  createdAtLte?: string;
  reportType: ReportTypeEnum[];
  workflowIds?: string[];
  subscriberIds?: string[];
  transactionIds?: string[];
  statuses?: string[];
  channels?: string[];
  topicKey?: string;
};

export type GetChartsResponse = {
  data: Record<
    ReportTypeEnum,
    | ChartDataPoint[]
    | InteractionTrendDataPoint[]
    | WorkflowVolumeDataPoint[]
    | ProviderVolumeDataPoint[]
    | MessagesDeliveredDataPoint
    | ActiveSubscribersDataPoint
    | AvgMessagesPerSubscriberDataPoint
    | WorkflowRunsMetricDataPoint
    | TotalInteractionsDataPoint
    | WorkflowRunsTrendDataPoint[]
    | ActiveSubscribersTrendDataPoint[]
    | WorkflowRunsCountDataPoint
  >;
};

export async function getCharts({
  environment,
  createdAtGte,
  createdAtLte,
  reportType,
  workflowIds,
  subscriberIds,
  transactionIds,
  statuses,
  channels,
  topicKey,
  signal,
}: {
  environment: IEnvironment;
  createdAtGte?: string;
  createdAtLte?: string;
  reportType: ReportTypeEnum[];
  workflowIds?: string[];
  subscriberIds?: string[];
  transactionIds?: string[];
  statuses?: string[];
  channels?: string[];
  topicKey?: string;
  signal?: AbortSignal;
}): Promise<GetChartsResponse> {
  const searchParams = new URLSearchParams();

  if (createdAtGte) {
    searchParams.append('createdAtGte', createdAtGte);
  }

  if (createdAtLte) {
    searchParams.append('createdAtLte', createdAtLte);
  }

  for (const type of reportType) {
    searchParams.append('reportType[]', type);
  }

  if (workflowIds?.length) {
    for (const id of workflowIds) {
      searchParams.append('workflowIds[]', id);
    }
  }

  if (subscriberIds?.length) {
    for (const id of subscriberIds) {
      searchParams.append('subscriberIds[]', id);
    }
  }

  if (transactionIds?.length) {
    for (const id of transactionIds) {
      searchParams.append('transactionIds[]', id);
    }
  }

  if (statuses?.length) {
    for (const status of statuses) {
      searchParams.append('statuses[]', status);
    }
  }

  if (channels?.length) {
    for (const channel of channels) {
      searchParams.append('channels[]', channel);
    }
  }

  if (topicKey) {
    searchParams.append('topicKey', topicKey);
  }

  return get<GetChartsResponse>(`/activity/charts?${searchParams.toString()}`, {
    environment,
    signal,
  });
}
