import { StepRunV2ReadRow, Trace } from '@novu/application-generic';
import {
  ExecutionDetailFeedItem,
  JobFeedItem,
  JobStatusEnum,
  NotificationFeedItemEntity,
  NotificationStepEntity,
  NotificationTemplateEntity,
} from '@novu/dal';
import {
  ExecutionDetailsSourceEnum,
  ExecutionDetailsStatusEnum,
  IWorkflowStepMetadata,
  StepTypeEnum,
} from '@novu/shared';

export type StepTraceFetchResult = Pick<Trace, 'entity_id' | 'id' | 'status' | 'title' | 'raw_data' | 'created_at'>;

type DigestMetadata = NonNullable<JobFeedItem['digest']>;

/** ClickHouse returns DateTime64 as `YYYY-MM-DD HH:mm:ss.SSS` in UTC. */
export function parseClickHouseDateTime(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

/** Same order the jobs populate used: creation time, then id. */
export function sortStepRuns(rows: StepRunV2ReadRow[]): StepRunV2ReadRow[] {
  return [...rows].sort((left, right) => {
    if (left.created_at !== right.created_at) {
      return left.created_at < right.created_at ? -1 : 1;
    }

    return left.step_run_id.localeCompare(right.step_run_id);
  });
}

export function groupStepRunsByWorkflowRunId(rows: StepRunV2ReadRow[]): Map<string, StepRunV2ReadRow[]> {
  const grouped = new Map<string, StepRunV2ReadRow[]>();

  for (const row of sortStepRuns(rows)) {
    const workflowRunRows = grouped.get(row.workflow_run_id) ?? [];
    workflowRunRows.push(row);
    grouped.set(row.workflow_run_id, workflowRunRows);
  }

  return grouped;
}

/** Workflow steps and their variants by step `_id`, which is what `step_runs_v2.step_id` holds. */
export function indexWorkflowSteps(
  workflows: Pick<NotificationTemplateEntity, '_id' | 'steps'>[]
): Map<string, NotificationStepEntity> {
  const stepsById = new Map<string, NotificationStepEntity>();

  for (const workflow of workflows) {
    for (const step of workflow.steps ?? []) {
      for (const candidate of [step, ...(step.variants ?? [])]) {
        if (candidate._id) {
          stepsById.set(String(candidate._id), candidate);
        }
      }
    }
  }

  return stepsById;
}

/** Digest events are logged as the JSON array on the `digest_triggered` trace. */
export function parseDigestEvents(rawData: string | null | undefined): Record<string, unknown>[] | undefined {
  if (!rawData) {
    return undefined;
  }

  try {
    return toRecordArray(JSON.parse(rawData));
  } catch {
    return undefined;
  }
}

export function parseDigestMetadata(rawMetadata: string | null | undefined): IWorkflowStepMetadata | undefined {
  if (!rawMetadata) {
    return undefined;
  }

  try {
    return toDigestMetadata(JSON.parse(rawMetadata));
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRecordArray(value: unknown): Record<string, unknown>[] | undefined {
  return Array.isArray(value) ? value.filter(isRecord) : undefined;
}

/** The column holds what the writer serialized from `job.digest`, so an object is the job's step metadata. */
function toDigestMetadata(value: unknown): IWorkflowStepMetadata | undefined {
  return isRecord(value) ? (value as IWorkflowStepMetadata) : undefined;
}

function mapTraceStatus(traceStatus: string): ExecutionDetailsStatusEnum {
  switch (traceStatus.toLowerCase()) {
    case 'success':
      return ExecutionDetailsStatusEnum.SUCCESS;
    case 'error':
    case 'failed':
      return ExecutionDetailsStatusEnum.FAILED;
    case 'warning':
      return ExecutionDetailsStatusEnum.WARNING;
    case 'queued':
      return ExecutionDetailsStatusEnum.QUEUED;
    default:
      return ExecutionDetailsStatusEnum.PENDING;
  }
}

/** Traces carry no retry, test or source information; the ClickHouse execution details paths use these defaults. */
export function mapTraceToExecutionDetail(trace: StepTraceFetchResult, providerId: string): ExecutionDetailFeedItem {
  return {
    _id: trace.id,
    _jobId: trace.entity_id,
    providerId: providerId || undefined,
    detail: trace.title,
    source: ExecutionDetailsSourceEnum.INTERNAL,
    status: mapTraceStatus(trace.status),
    isTest: false,
    isRetry: false,
    // Typed as Date, but ClickHouse JSON rows carry DateTime64 as a string.
    createdAt: parseClickHouseDateTime(String(trace.created_at)).toISOString(),
    raw: trace.raw_data,
  };
}

/** Steps removed from their workflow keep the identity `step_runs_v2` recorded for them. */
function buildStepFromRow(row: StepRunV2ReadRow): NotificationStepEntity {
  return {
    _id: row.step_id || undefined,
    _templateId: '',
    stepId: row.step_identifier || undefined,
    name: row.step_name || undefined,
    filters: [],
  };
}

function buildDigest(row: StepRunV2ReadRow, digestEvents?: Record<string, unknown>[]): DigestMetadata | undefined {
  const metadata = parseDigestMetadata(row.digest_metadata);

  if (!metadata) {
    return undefined;
  }

  return digestEvents ? { ...metadata, events: digestEvents } : metadata;
}

export type StepRunJobContext = {
  notification: Pick<NotificationFeedItemEntity, 'payload'>;
  workflowStepsById: Map<string, NotificationStepEntity>;
  tracesByStepRunId: Map<string, StepTraceFetchResult[]>;
  digestEventsByStepRunId: Map<string, Record<string, unknown>[]>;
};

/**
 * Builds the job the activity feed used to populate from Mongo. Overrides are left unset so the DTO mapper
 * resolves them from the notification, and the payload is the notification's trigger payload.
 */
export function mapStepRunToJob(row: StepRunV2ReadRow, context: StepRunJobContext): JobFeedItem {
  return {
    _id: row.step_run_id,
    type: row.step_type as StepTypeEnum,
    status: row.status as JobStatusEnum,
    providerId: row.provider_id || undefined,
    step: context.workflowStepsById.get(row.step_id) ?? buildStepFromRow(row),
    payload: context.notification.payload,
    digest: buildDigest(row, context.digestEventsByStepRunId.get(row.step_run_id)),
    // Jobs carry no count until their schedule is first extended; the row stores that as 0.
    scheduleExtensionsCount: Number(row.schedule_extensions_count) || undefined,
    createdAt: parseClickHouseDateTime(row.created_at).toISOString(),
    updatedAt: parseClickHouseDateTime(row.updated_at).toISOString(),
    executionDetails: (context.tracesByStepRunId.get(row.step_run_id) ?? []).map((trace) =>
      mapTraceToExecutionDetail(trace, row.provider_id)
    ),
  };
}
