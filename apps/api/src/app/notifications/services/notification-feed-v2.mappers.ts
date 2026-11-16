import { StepRunV2ReadRow, Trace } from '@novu/application-generic';
import { ExecutionDetailFeedItem, JobFeedItem, JobStatusEnum, NotificationStepEntity } from '@novu/dal';
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

/**
 * Same mapping as the ClickHouse-only execution details read of `/v1/notifications`: traces carry no retry, test or
 * source information, and that read leaves the provider unset.
 */
export function mapTraceToExecutionDetail(trace: StepTraceFetchResult): ExecutionDetailFeedItem {
  return {
    _id: trace.id,
    _jobId: trace.entity_id,
    providerId: undefined,
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

/**
 * The step identity recorded on the row. Without the jobs collection the activity feed returns this reduced step:
 * the step's configuration (filters, metadata, control values, message template) is not part of it.
 */
function buildStep(row: StepRunV2ReadRow): NotificationStepEntity {
  return {
    _id: row.step_id || undefined,
    _templateId: '',
    stepId: row.step_identifier || undefined,
    name: row.step_name || undefined,
    // Jobs are only created for active steps.
    active: true,
    filters: [],
    template: { type: row.step_type as StepTypeEnum } as NotificationStepEntity['template'],
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
  tracesByStepRunId: Map<string, StepTraceFetchResult[]>;
  digestEventsByStepRunId: Map<string, Record<string, unknown>[]>;
};

/**
 * Builds the job the activity feed used to populate from Mongo. Overrides are left unset so the DTO mapper
 * resolves them from the notification. The payload is left unset too: under payload dedup jobs carry none.
 */
export function mapStepRunToJob(row: StepRunV2ReadRow, context: StepRunJobContext): JobFeedItem {
  return {
    _id: row.step_run_id,
    type: row.step_type as StepTypeEnum,
    status: row.status as JobStatusEnum,
    providerId: row.provider_id || undefined,
    step: buildStep(row),
    // Under payload dedup jobs carry no payload; the run's payload is on the notification.
    payload: undefined,
    digest: buildDigest(row, context.digestEventsByStepRunId.get(row.step_run_id)),
    // Jobs carry no count until their schedule is first extended; the row stores that as 0.
    scheduleExtensionsCount: Number(row.schedule_extensions_count) || undefined,
    createdAt: parseClickHouseDateTime(row.created_at).toISOString(),
    updatedAt: parseClickHouseDateTime(row.updated_at).toISOString(),
    executionDetails: (context.tracesByStepRunId.get(row.step_run_id) ?? []).map((trace) =>
      mapTraceToExecutionDetail(trace)
    ),
  };
}
