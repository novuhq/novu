import {
  ChannelCTATypeEnum,
  type IActivity,
  type IActivityJob,
  type IEnvironment,
  type IExecutionDetail,
  JobStatusEnum,
  SeverityLevelEnum,
  StepTypeEnum,
  TriggerTypeEnum,
} from '@novu/shared';
import { type ActivityDateRange, parseActivityTransactionIds, resolveActivityDateRange } from '@/utils/activityFilters';
import { get } from './api.client';

export type ActivityFilters = {
  channels?: string[];
  workflows?: string[];
  email?: string;
  subscriberId?: string;
  transactionId?: string;
  dateRange?: ActivityDateRange;
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
  stepType: StepTypeEnum;
  providerId?: string;
  status: StepRunStatus;
  createdAt: Date;
  updatedAt: Date;
  executionDetails: IExecutionDetail[];
  digest?: IActivityJob['digest'];
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
  overrides?: Record<string, unknown>;
};

export interface GetWorkflowRunsResponseDto {
  data: GetWorkflowRunsDto[];
  next: string | null;
  previous: string | null;
}

function mapWorkflowRunToActivity(workflowRun: GetWorkflowRunResponse | GetWorkflowRunsDto): IActivity {
  const resolvedOverrides = ('overrides' in workflowRun ? (workflowRun.overrides ?? {}) : {}) as Record<
    string,
    Record<string, unknown>
  >;

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
          type: TriggerTypeEnum.EVENT,
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
      type: step.stepType,
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
          type: step.stepType,
          content: '',
          variables: [],
          name: step.stepType,
          subject: '',
          title: step.stepType,
          preheader: '',
          senderName: '',
          _feedId: '',
          cta: {
            type: ChannelCTATypeEnum.REDIRECT,
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
      status: STEP_RUN_STATUS_TO_JOB_STATUS[step.status],
      _templateId: workflowRun.workflowId,
      payload: 'payload' in workflowRun ? workflowRun.payload : {},
      providerId: step.providerId,
      overrides: resolvedOverrides,
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

function appendEach(searchParams: URLSearchParams, key: string, values?: string[]) {
  for (const value of values ?? []) {
    searchParams.append(key, value);
  }
}

function appendIfPresent(searchParams: URLSearchParams, key: string, value?: string) {
  if (value) {
    searchParams.append(key, value);
  }
}

function appendTransactionIds(searchParams: URLSearchParams, key: string, transactionId?: string) {
  if (!transactionId) {
    return;
  }

  appendEach(searchParams, key, parseActivityTransactionIds(transactionId));
}

function appendDateRange(
  searchParams: URLSearchParams,
  filters: ActivityFilters | undefined,
  keys: { after: string; before: string }
) {
  if (!filters?.dateRange) {
    return;
  }

  const { after, before } = resolveActivityDateRange(filters.dateRange);

  appendIfPresent(searchParams, keys.after, after);
  appendIfPresent(searchParams, keys.before, before);
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

  appendEach(searchParams, 'channels', filters?.channels);
  appendEach(searchParams, 'severity', filters?.severity);
  appendEach(searchParams, 'templates', filters?.workflows);
  appendIfPresent(searchParams, 'emails', filters?.email);
  appendIfPresent(searchParams, 'subscriberIds', filters?.subscriberId);
  appendTransactionIds(searchParams, 'transactionId', filters?.transactionId);
  appendIfPresent(searchParams, 'topicKey', filters?.topicKey);
  appendIfPresent(searchParams, 'subscriptionId', filters?.subscriptionId);
  appendEach(searchParams, 'contextKeys', filters?.contextKeys);
  appendDateRange(searchParams, filters, { after: 'after', before: 'before' });

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

/** The legacy activity feed has no queued state, so queued step runs surface as pending. */
const STEP_RUN_STATUS_TO_JOB_STATUS: Record<StepRunStatus, JobStatusEnum> = {
  pending: JobStatusEnum.PENDING,
  queued: JobStatusEnum.PENDING,
  running: JobStatusEnum.RUNNING,
  completed: JobStatusEnum.COMPLETED,
  failed: JobStatusEnum.FAILED,
  delayed: JobStatusEnum.DELAYED,
  canceled: JobStatusEnum.CANCELED,
  merged: JobStatusEnum.MERGED,
  skipped: JobStatusEnum.SKIPPED,
};

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

  appendEach(searchParams, 'channels', filters?.channels);
  appendIfPresent(searchParams, 'topicKey', filters?.topicKey);
  appendIfPresent(searchParams, 'subscriptionId', filters?.subscriptionId);

  // Use cursor if provided, otherwise fall back to page-based
  if (cursor) {
    searchParams.append('cursor', cursor);
  } else if (page && page > 0) {
    // For backward compatibility, convert page to cursor
    searchParams.append('cursor', `page_${page}`);
  }

  appendEach(searchParams, 'workflowIds', filters?.workflows);
  appendIfPresent(searchParams, 'subscriberIds', filters?.subscriberId);
  appendTransactionIds(searchParams, 'transactionIds', filters?.transactionId);
  appendDateRange(searchParams, filters, { after: 'createdGte', before: 'createdLte' });
  appendEach(searchParams, 'severity', filters?.severity);
  appendEach(searchParams, 'contextKeys', filters?.contextKeys);

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
    transactionIds = parseActivityTransactionIds(filters.transactionId);
  }

  if (period) {
    createdAtGte = period.start;
    createdAtLte = period.end;
  } else if (filters?.dateRange) {
    const { after, before } = resolveActivityDateRange(filters.dateRange);
    createdAtGte = after;
    createdAtLte = before;
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
