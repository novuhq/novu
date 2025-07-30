import { getDateRangeInMs, IActivity, IEnvironment } from '@novu/shared';
import { get } from './api.client';

export type ActivityFilters = {
  channels?: string[];
  workflows?: string[];
  email?: string;
  subscriberId?: string;
  transactionId?: string;
  dateRange?: string;
  topicKey?: string;
};

export interface ActivityResponse {
  data: IActivity[];
  hasMore: boolean;
  pageSize: number;
  next?: string | null;
  previous?: string | null;
}

export interface WorkflowRunStepsDetailsDto {
  id: string;
  stepRunId: string;
  stepType: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'delayed' | 'canceled' | 'merged' | 'skipped';
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
  steps: WorkflowRunStepsDetailsDto[];
}

export interface GetWorkflowRunsResponseDto {
  data: GetWorkflowRunsDto[];
  next: string | null;
  previous: string | null;
}

// Common workflow run properties interface
interface BaseWorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  organizationId: string;
  environmentId: string;
  internalSubscriberId: string;
  subscriberId?: string;
  triggerIdentifier: string;
  transactionId: string;
  createdAt: string;
  updatedAt: string;
}

// Step mapping configuration
interface StepMappingConfig {
  stepId: string;
  stepRunId: string;
  stepType: string;
  status: StepRunStatus;
  executionDetails?: any[];
  providerId?: string;
}

// Base mapping function for workflow runs to activities
function mapWorkflowRunToActivityBase(
  workflowRun: BaseWorkflowRun,
  steps: StepMappingConfig[],
  payload: Record<string, unknown> = {}
): IActivity {
  return {
    _id: workflowRun.id,
    _templateId: workflowRun.workflowId,
    _environmentId: workflowRun.environmentId,
    _organizationId: workflowRun.organizationId,
    _subscriberId: workflowRun.internalSubscriberId,
    transactionId: workflowRun.transactionId,
    channels: [], // Not available in workflow runs, empty array for compatibility
    to: {
      subscriberId: workflowRun.subscriberId || workflowRun.internalSubscriberId,
    },
    payload,
    tags: [], // Not available in workflow runs, empty array for compatibility
    createdAt: workflowRun.createdAt,
    updatedAt: workflowRun.updatedAt,
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
    jobs: steps.map((step) => ({
      _id: step.stepRunId,
      identifier: step.stepRunId,
      subscriberId: workflowRun.subscriberId || workflowRun.internalSubscriberId,
      _subscriberId: workflowRun.internalSubscriberId,
      type: step.stepType as any,
      digest: undefined,
      executionDetails: step.executionDetails || [],
      step: {
        _id: step.stepId,
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
      delay: undefined,
      _notificationId: workflowRun.id,
      status: step.status as any,
      _templateId: workflowRun.workflowId,
      payload,
      providerId: step.providerId,
      overrides: {},
      transactionId: workflowRun.transactionId,
      createdAt: workflowRun.createdAt,
      updatedAt: workflowRun.updatedAt,
    })),
  };
}

// Mapping function to convert workflow runs to activities (legacy format)
function mapWorkflowRunsToActivity(workflowRun: GetWorkflowRunsDto): IActivity {
  const steps: StepMappingConfig[] = workflowRun.steps.map((step) => ({
    stepId: step.stepRunId, // Legacy uses stepRunId for step._id
    stepRunId: step.stepRunId,
    stepType: step.stepType,
    status: step.status,
    executionDetails: [], // Not available in legacy
    providerId: undefined, // Not available in legacy
  }));

  // Override the job _id to use the legacy step.id field
  const activity = mapWorkflowRunToActivityBase(workflowRun, steps, {});
  activity.jobs = activity.jobs.map((job, index) => ({
    ...job,
    _id: workflowRun.steps[index].id, // Use the original step.id for legacy compatibility
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
    // Parse comma-delimited string into array for backend
    const transactionIds = filters.transactionId
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionIds.length > 1) {
      transactionIds.forEach((id) => {
        searchParams.append('transactionId', id);
      });
    } else {
      searchParams.append('transactionId', filters.transactionId);
    }
  }

  if (filters?.topicKey) {
    searchParams.append('topicKey', filters.topicKey);
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

export interface StepRunDto {
  stepRunId: string;
  stepId: string;
  stepType: string;
  providerId?: string;
  status: StepRunStatus;
  createdAt: Date;
  updatedAt: Date;
  executionDetails: any[];
}

export type GetWorkflowRunResponse = {
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
  payload: Record<string, unknown>;
  steps: StepRunDto[];
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

  // Use cursor if provided, otherwise fall back to page-based
  if (cursor) {
    searchParams.append('cursor', cursor);
  } else if (page && page > 0) {
    // For backward compatibility, convert page to cursor
    searchParams.append('cursor', `page_${page}`);
  }

  if (filters?.workflows?.length) {
    filters.workflows.forEach((workflow) => {
      searchParams.append('workflowIds', workflow);
    });
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
      transactionIds.forEach((id) => {
        searchParams.append('transactionId', id);
      });
    } else {
      searchParams.append('transactionIds', filters.transactionId);
    }
  }

  if (filters?.dateRange) {
    const after = new Date(Date.now() - getDateRangeInMs(filters?.dateRange));
    searchParams.append('createdGte', after.toISOString());
  }

  const response = await get<GetWorkflowRunsResponseDto>(`/activity/workflow-runs?${searchParams.toString()}`, {
    environment,
    signal,
  });

  // Map the new format to the old format for backward compatibility
  const mappedData = response.data.map(mapWorkflowRunsToActivity);

  return {
    data: mappedData,
    hasMore: !!response.next, // Convert cursor-based to boolean
    pageSize: response.data.length,
    next: response.next,
    previous: response.previous,
  };
}

function mapWorkflowRunToActivity(workflowRun: GetWorkflowRunResponse): IActivity {
  const steps: StepMappingConfig[] = workflowRun.steps.map((step) => ({
    stepId: step.stepId,
    stepRunId: step.stepRunId,
    stepType: step.stepType,
    status: step.status,
    executionDetails: step.executionDetails,
    providerId: step.providerId,
  }));

  return mapWorkflowRunToActivityBase(workflowRun, steps, workflowRun.payload);
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
