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

export interface StepRunDto {
  stepRunId: string;
  stepId: string;
  stepType: string;
  providerId?: string;
  status: StepRunStatus;
  createdAt: Date;
  updatedAt: Date;
  executionDetails: any[];
  digest?: any;
  scheduleExtensionsCount?: number;
}

export interface GetWorkflowRunsDto {
  id: string;
  workflowRunId: string;
  workflowId: string;
  workflowName: string;
  organizationId: string;
  environmentId: string;
  internalSubscriberId: string;
  subscriberId?: string;
  status: 'success' | 'error' | 'pending' | 'skipped' | 'canceled' | 'merged';
  triggerIdentifier: string;
  transactionId: string;
  createdAt: string;
  updatedAt: string;
  steps: StepRunDto[];
  severity: SeverityLevelEnum;
  critical: boolean;
  contextKeys?: string[];
  topics?: { _topicId: string; topicKey: string }[];
}

export type GetWorkflowRunResponse = GetWorkflowRunsDto & {
  payload: Record<string, unknown>;
};

export interface GetWorkflowRunsResponseDto {
  data: GetWorkflowRunsDto[];
  next: string | null;
  previous: string | null;
}

function mapWorkflowRunToActivity(workflowRun: GetWorkflowRunResponse | GetWorkflowRunsDto): IActivity {
  return {
    _id: workflowRun.id,
    severity: workflowRun.severity,
    critical: workflowRun.critical,
    _templateId: workflowRun.workflowId,
    _environmentId: workflowRun.environmentId,
    _organizationId: workflowRun.organizationId,
    _subscriberId: workflowRun.internalSubscriberId,
    transactionId: workflowRun.transactionId,
    channels: [], // Not available in workflow runs, empty array for compatibility
    to: {
      subscriberId: workflowRun.subscriberId || workflowRun.internalSubscriberId,
    },
    payload: 'payload' in workflowRun ? workflowRun.payload : {},
    tags: [], // Not available in workflow runs, empty array for compatibility
    createdAt: workflowRun.createdAt,
    updatedAt: workflowRun.updatedAt,
    contextKeys: workflowRun.contextKeys || [],
    topics: workflowRun.topics || [],
    template: {
      _id: workflowRun.workflowId,
      name: workflowRun.workflowName,
      triggers: [
        {
          type: 'event' as any,
          identifier: workflowRun.triggerIdentifier,
          variables: [],
        },
      ],
      origin: undefined,
    },
    subscriber: workflowRun.subscriberId
      ? {
          _id: workflowRun.internalSubscriberId,
          subscriberId: workflowRun.subscriberId,
          firstName: '',
          lastName: '',
        }
      : undefined,
    jobs: workflowRun.steps.map((step: StepRunDto) => ({
      _id: step.stepRunId,
      identifier: step.stepRunId,
      subscriberId: workflowRun.subscriberId || workflowRun.internalSubscriberId,
      _subscriberId: workflowRun.internalSubscriberId,
      type: step.stepType as any,
      digest: step.digest,
      executionDetails: step.executionDetails || [],
      step: {
        _id: step.stepRunId,
        active: true,
        shouldStopOnFail: false,
        template: {
          _environmentId: workflowRun.environmentId,
          _organizationId: workflowRun.organizationId,
          _creatorId: '',
          type: step.stepType as any,
          content: '',
          variables: [],
          name: step.stepType,
          subject: '',
          title: step.stepType,
          preheader: '',
          senderName: '',
          _feedId: '',
          cta: {
            type: 'redirect' as any,
            data: { url: '' },
          },
          _layoutId: null,
          active: true,
        },
        filters: [],
        _templateId: workflowRun.workflowId,
        _parentId: '',
      },
      _organizationId: workflowRun.organizationId,
      _environmentId: workflowRun.environmentId,
      _userId: '',
      // delay: step.delay,
      _notificationId: workflowRun.id,
      status: step.status === 'queued' ? 'pending' : (step.status as any),
      _templateId: workflowRun.workflowId,
      payload: 'payload' in workflowRun ? workflowRun.payload : {},
      providerId: undefined,
      overrides: {},
      transactionId: workflowRun.transactionId,
      createdAt: workflowRun.createdAt,
      updatedAt: workflowRun.updatedAt,
      scheduleExtensionsCount: step.scheduleExtensionsCount,
    })),
  };
}

// Mapping function to convert workflow runs to activities (legacy format)
function mapWorkflowRunsToActivity(workflowRun: GetWorkflowRunsDto): IActivity {
  // Override the job _id to use the legacy step.id field
  const activity = mapWorkflowRunToActivity(workflowRun);
  activity.jobs = activity.jobs.map((job, index) => ({
    ...job,
    _id: workflowRun.steps[index].stepId,
  }));

  return activity;
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

// Types for the new workflow run endpoint
export type StepRunStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'canceled'
  | 'merged'
  | 'skipped';

export type GetWorkflowRunResponseDto = {
  data: GetWorkflowRunResponse;
};

export async function getWorkflowRunsList({
  environment,
  page,
  limit,
  filters,
  signal,
  cursor,
}: {
  environment: IEnvironment;
  page?: number;
  limit: number;
  filters?: ActivityFilters;
  signal?: AbortSignal;
  cursor?: string | null;
}): Promise<ActivityResponse> {
  const searchParams = new URLSearchParams();
  searchParams.append('limit', limit.toString());

  if (filters?.channels?.length) {
    for (const channel of filters.channels) {
      searchParams.append('channels', channel);
    }
  }

  if (filters?.topicKey) {
    searchParams.append('topicKey', filters.topicKey);
  }

  if (filters?.subscriptionId) {
    searchParams.append('subscriptionId', filters.subscriptionId);
  }

  // Use cursor if provided, otherwise fall back to page-based
  if (cursor) {
    searchParams.append('cursor', cursor);
  } else if (page && page > 0) {
    // For backward compatibility, convert page to cursor
    searchParams.append('cursor', `page_${page}`);
  }

  if (filters?.workflows?.length) {
    for (const workflow of filters.workflows) {
      searchParams.append('workflowIds', workflow);
    }
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
      searchParams.append('transactionIds', filters.transactionId);
    }
  }

  if (filters?.dateRange) {
    const after = new Date(Date.now() - getDateRangeInMs(filters?.dateRange));
    searchParams.append('createdGte', after.toISOString());
  }

  if (filters?.severity?.length) {
    for (const severity of filters.severity) {
      searchParams.append('severity', severity);
    }
  }

  if (filters?.contextKeys?.length) {
    for (const key of filters.contextKeys) {
      searchParams.append('contextKeys', key);
    }
  }

  const response = await get<GetWorkflowRunsResponseDto>(`/activity/workflow-runs?${searchParams.toString()}`, {
    environment,
    signal,
  });

  const mappedData = response.data.map(mapWorkflowRunsToActivity);

  return {
    data: mappedData,
    hasMore: !!response.next, // Convert cursor-based to boolean
    pageSize: response.data.length,
    next: response.next,
    previous: response.previous,
  };
}

export async function getNotification(notificationId: string, environment: IEnvironment): Promise<IActivity> {
  const { data } = await get<{ data: IActivity }>(`/notifications/${notificationId}`, {
    environment,
  });

  return data;
}

export async function getWorkflowRun(workflowRunId: string, environment: IEnvironment): Promise<IActivity> {
  const data = await get<GetWorkflowRunResponseDto>(`/activity/workflow-runs/${workflowRunId}`, {
    environment,
  });

  return mapWorkflowRunToActivity(data.data);
}

export async function getWorkflowRunsCount({
  environment,
  filters,
  signal,
}: {
  environment: IEnvironment;
  filters?: ActivityFilters;
  signal?: AbortSignal;
}): Promise<number> {
  let createdAtGte: string | undefined;
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
    // Parse comma-delimited string into array for backend
    transactionIds = filters.transactionId
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
  }

  if (filters?.dateRange) {
    const after = new Date(Date.now() - getDateRangeInMs(filters?.dateRange));
    createdAtGte = after.toISOString();
  }

  const response = await getCharts({
    environment,
    createdAtGte,
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
