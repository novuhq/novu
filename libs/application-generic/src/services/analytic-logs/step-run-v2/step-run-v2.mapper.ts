import { JobEntity, JobStatusEnum } from '@novu/dal';
import { IWorkflowStepMetadata, StepTypeEnum } from '@novu/shared';
import { mapStepTypeEnumToStepType } from '../map-step-type';
import { StepRunStatus } from '../step-run/step-run.schema';
import {
  STEP_RUN_V2_TERMINAL_STATUSES,
  StepRunV2Row,
  TERMINAL_VERSION_OFFSET,
  toClickHouseDateTime64,
} from './step-run-v2.schema';

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

/**
 * Bridge-resolved delay settings are persisted on `step.metadata`; `job.digest` keeps the settings the job was
 * created with. Digest settings are resolved onto `job.digest`.
 */
function getWaitMetadata(job: JobEntity, stepType: StepTypeEnum | undefined): IWorkflowStepMetadata | undefined {
  if (stepType === StepTypeEnum.DELAY) {
    return job.step?.metadata ?? job.digest;
  }

  return job.digest;
}

function getWaitFields(
  job: JobEntity,
  stepType: StepTypeEnum | undefined
): Pick<StepRunV2Row, 'wait_amount' | 'wait_unit' | 'wait_type' | 'wait_until'> {
  const metadata = getWaitMetadata(job, stepType);
  const amount = metadata && 'amount' in metadata && typeof metadata.amount === 'number' ? metadata.amount : 0;
  const unit = metadata && 'unit' in metadata && metadata.unit ? String(metadata.unit) : '';
  const metadataType = metadata && 'type' in metadata ? metadata.type : undefined;
  const stepMetadataType = job.step?.metadata && 'type' in job.step.metadata ? job.step.metadata.type : undefined;
  const timedUntil = job.digest && 'timed' in job.digest ? job.digest.timed?.untilDate : undefined;
  const resolvedUntil = parseOptionalDate(job.waitUntil ?? timedUntil);

  return {
    wait_amount: Number.isFinite(amount) && amount > 0 ? amount : 0,
    wait_unit: unit,
    wait_type: String(metadataType ?? stepMetadataType ?? ''),
    wait_until: toClickHouseDateTime64(resolvedUntil ?? new Date(0)),
  };
}

function parseOptionalDate(value: string | Date | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseJobDate(value: string | number | Date): Date {
  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const epochMs = new Date(Number(value));

  if (Number.isNaN(epochMs.getTime())) {
    throw new Error(`Invalid job date: ${String(value)}`);
  }

  return epochMs;
}

/**
 * Maps a job document as Mongo holds it after a status change. The row version comes from the document's
 * `updatedAt`, so rows order by the Mongo writes that produced them rather than by when they were logged.
 * Freshly inserted jobs carry no `updatedAt` in memory; Mongo sets it to `createdAt` on insert.
 */
export function mapJobToStepRunV2(job: JobEntity): StepRunV2Row {
  const stepTypeEnum = job.type || job.step?.template?.type;
  const status = mapJobStatus(job.status);
  const createdAt = parseJobDate(job.createdAt);
  const updatedAt = job.updatedAt ? parseJobDate(job.updatedAt) : createdAt;
  const isCompletedDigest = status === 'completed' && stepTypeEnum === StepTypeEnum.DIGEST;

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
    ...getWaitFields(job, stepTypeEnum),
    digest_events_count: isCompletedDigest ? (job.digest?.events?.length ?? 0) : 0,
    schedule_extensions_count: job.scheduleExtensionsCount ?? 0,
    created_at: toClickHouseDateTime64(createdAt),
    updated_at: toClickHouseDateTime64(updatedAt),
    version: computeStepRunV2Version(status, updatedAt),
  };
}
