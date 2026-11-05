import { JobEntity, JobStatusEnum } from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { mapStepTypeEnumToStepType } from '../map-step-type';
import { StepRunStatus } from '../step-run/step-run.schema';
import {
  STEP_RUN_V2_TERMINAL_STATUSES,
  StepRunV2Row,
  TERMINAL_VERSION_OFFSET,
  toClickHouseDateTime64,
} from './step-run-v2.schema';

export type MapJobToStepRunV2Options = {
  status: JobStatusEnum;
  updatedAt: Date;
  waitUntil?: Date;
  digestEventsCount?: number;
};

export function isStepRunV2TerminalStatus(status: StepRunStatus): boolean {
  return (STEP_RUN_V2_TERMINAL_STATUSES as readonly StepRunStatus[]).includes(status);
}

export function computeStepRunV2Version(status: StepRunStatus, updatedAt: Date): number {
  return updatedAt.getTime() + (isStepRunV2TerminalStatus(status) ? TERMINAL_VERSION_OFFSET : 0);
}

function mapJobStatus(status: JobStatusEnum): StepRunStatus {
  switch (status) {
    case JobStatusEnum.PENDING:
      return 'pending';
    case JobStatusEnum.QUEUED:
      return 'queued';
    case JobStatusEnum.RUNNING:
      return 'running';
    case JobStatusEnum.DELAYED:
      return 'delayed';
    case JobStatusEnum.COMPLETED:
      return 'completed';
    case JobStatusEnum.FAILED:
      return 'failed';
    case JobStatusEnum.CANCELED:
      return 'canceled';
    case JobStatusEnum.MERGED:
      return 'merged';
    case JobStatusEnum.SKIPPED:
      return 'skipped';
    default: {
      const _exhaustiveCheck: never = status;

      return _exhaustiveCheck;
    }
  }
}

function getWaitFields(job: JobEntity, waitUntil?: Date): Pick<StepRunV2Row, 'wait_amount' | 'wait_unit' | 'wait_until'> {
  const digest = job.digest;
  const amount = digest && 'amount' in digest && typeof digest.amount === 'number' ? digest.amount : 0;
  const unit = digest && 'unit' in digest && digest.unit ? String(digest.unit) : '';
  const timedUntil = digest && 'timed' in digest ? digest.timed?.untilDate : undefined;
  const resolvedUntil = waitUntil ?? (timedUntil ? new Date(timedUntil) : undefined);
  const hasValidUntil = resolvedUntil !== undefined && !Number.isNaN(resolvedUntil.getTime());

  return {
    wait_amount: Math.max(0, Math.trunc(amount)),
    wait_unit: unit,
    wait_until: toClickHouseDateTime64(hasValidUntil ? resolvedUntil : new Date(0)),
  };
}

function parseJobCreatedAt(createdAt: string | number | Date): Date {
  const parsed = new Date(createdAt);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const epochMs = new Date(Number(createdAt));

  if (Number.isNaN(epochMs.getTime())) {
    throw new Error(`Invalid job createdAt: ${String(createdAt)}`);
  }

  return epochMs;
}

/**
 * Returns null for trigger jobs, which are never written to step_runs_v2.
 */
export function mapJobToStepRunV2(job: JobEntity, options: MapJobToStepRunV2Options): StepRunV2Row | null {
  const stepTypeEnum = job.type || job.step?.template?.type;

  if (stepTypeEnum === StepTypeEnum.TRIGGER) {
    return null;
  }

  const status = mapJobStatus(options.status);

  return {
    environment_id: String(job._environmentId),
    workflow_run_id: String(job._notificationId),
    step_run_id: String(job._id),
    step_id: job.step?._id ? String(job.step._id) : '',
    step_identifier: job.step?.stepId || '',
    step_name: job.step?.name || '',
    step_type: mapStepTypeEnumToStepType(stepTypeEnum) ?? '',
    status,
    provider_id: job.providerId || '',
    ...getWaitFields(job, options.waitUntil),
    digest_events_count: status === 'completed' ? (options.digestEventsCount ?? 0) : 0,
    schedule_extensions_count: job.scheduleExtensionsCount ?? 0,
    created_at: toClickHouseDateTime64(parseJobCreatedAt(job.createdAt)),
    updated_at: toClickHouseDateTime64(options.updatedAt),
    version: computeStepRunV2Version(status, options.updatedAt),
  };
}
