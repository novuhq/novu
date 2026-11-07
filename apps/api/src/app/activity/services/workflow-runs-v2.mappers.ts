import { BadRequestException } from '@nestjs/common';
import { StepRunV2ReadRow } from '@novu/application-generic';
import { NotificationRepository, TerminalWorkflowStatusEvent, WorkflowRunStatusFilter } from '@novu/dal';
import {
  DelayTypeEnum,
  DeliveryLifecycleEventType,
  DeliveryLifecycleStatusEnum,
  DigestTypeEnum,
  DigestUnitEnum,
  StepTypeEnum,
} from '@novu/shared';
import { DigestMetadataDto } from '../../notifications/dtos/activities-response.dto';
import { WorkflowRunStatusDtoEnum } from '../dtos/shared.dto';

export type WorkflowRunsCursor = {
  created_at: string;
  workflow_run_id: string;
};

/** Cursor id that points before the newest run: the client is back on the first page. */
export const FIRST_PAGE_CURSOR_ID = '1';

const DELIVERY_STATUS_BY_EVENT: Record<DeliveryLifecycleEventType, DeliveryLifecycleStatusEnum> = {
  workflow_run_delivery_pending: DeliveryLifecycleStatusEnum.PENDING,
  workflow_run_delivery_sent: DeliveryLifecycleStatusEnum.SENT,
  workflow_run_delivery_errored: DeliveryLifecycleStatusEnum.ERRORED,
  workflow_run_delivery_skipped: DeliveryLifecycleStatusEnum.SKIPPED,
  workflow_run_delivery_canceled: DeliveryLifecycleStatusEnum.CANCELED,
  workflow_run_delivery_merged: DeliveryLifecycleStatusEnum.MERGED,
  workflow_run_delivery_delivered: DeliveryLifecycleStatusEnum.DELIVERED,
  workflow_run_delivery_interacted: DeliveryLifecycleStatusEnum.INTERACTED,
};

/** Wait types whose end is a point in time rather than an amount and unit. */
const UNTIL_DATE_WAIT_TYPES: string[] = [
  DigestTypeEnum.TIMED,
  DelayTypeEnum.TIMED,
  DelayTypeEnum.DYNAMIC,
  DelayTypeEnum.SCHEDULED,
];

const CLICKHOUSE_EPOCH = '1970-01-01 00:00:00.000';

export function mapWorkflowStatusEventToDto(
  event: TerminalWorkflowStatusEvent | null | undefined
): WorkflowRunStatusDtoEnum {
  switch (event) {
    case 'workflow_run_status_completed':
      return WorkflowRunStatusDtoEnum.COMPLETED;
    case 'workflow_run_status_error':
      return WorkflowRunStatusDtoEnum.ERROR;
    case null:
    case undefined:
      return WorkflowRunStatusDtoEnum.PROCESSING;
    default: {
      const _exhaustiveCheck: never = event;

      return WorkflowRunStatusDtoEnum.PROCESSING;
    }
  }
}

export function mapDeliveryEventToStatus(
  event: DeliveryLifecycleEventType | null | undefined
): DeliveryLifecycleStatusEnum {
  if (!event) {
    return DeliveryLifecycleStatusEnum.PENDING;
  }

  return DELIVERY_STATUS_BY_EVENT[event] ?? DeliveryLifecycleStatusEnum.PENDING;
}

export function mapStatusFilters(statuses?: WorkflowRunStatusDtoEnum[]): WorkflowRunStatusFilter[] | undefined {
  if (!statuses?.length) {
    return undefined;
  }

  return statuses.map((status) => {
    switch (status) {
      case WorkflowRunStatusDtoEnum.PROCESSING:
        return 'processing';
      case WorkflowRunStatusDtoEnum.COMPLETED:
        return 'completed';
      case WorkflowRunStatusDtoEnum.ERROR:
        return 'error';
      default: {
        const _exhaustiveCheck: never = status;

        throw new BadRequestException(`Unknown workflow run status: ${String(_exhaustiveCheck)}`);
      }
    }
  });
}

export function encodeWorkflowRunsCursor(data: WorkflowRunsCursor): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function decodeWorkflowRunsCursor(rawCursor: string): WorkflowRunsCursor {
  let cursor: Partial<WorkflowRunsCursor>;

  try {
    cursor = JSON.parse(Buffer.from(rawCursor, 'base64').toString('utf-8'));
  } catch {
    throw new BadRequestException('Invalid cursor format');
  }

  const isValidDate = typeof cursor?.created_at === 'string' && !Number.isNaN(new Date(cursor.created_at).getTime());
  const isValidId =
    typeof cursor?.workflow_run_id === 'string' &&
    (cursor.workflow_run_id === FIRST_PAGE_CURSOR_ID || NotificationRepository.isInternalId(cursor.workflow_run_id));

  if (!isValidDate || !isValidId) {
    throw new BadRequestException('Invalid cursor format');
  }

  return { created_at: cursor.created_at as string, workflow_run_id: cursor.workflow_run_id as string };
}

export function isFirstPageCursor(cursor: WorkflowRunsCursor): boolean {
  return cursor.workflow_run_id === FIRST_PAGE_CURSOR_ID;
}

/** ClickHouse returns DateTime64 as `YYYY-MM-DD HH:mm:ss.SSS` in UTC. */
export function parseClickHouseDateTime(value: string): Date {
  return new Date(`${value.replace(' ', 'T')}Z`);
}

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
    return toDigestEvents(JSON.parse(rawData));
  } catch {
    return undefined;
  }
}

function toDigestEvents(value: unknown): Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter(
    (event): event is Record<string, unknown> => typeof event === 'object' && event !== null && !Array.isArray(event)
  );
}

export function buildStepDigest(
  row: StepRunV2ReadRow,
  events?: Record<string, unknown>[]
): DigestMetadataDto | undefined {
  if (row.step_type !== StepTypeEnum.DIGEST && row.step_type !== StepTypeEnum.DELAY) {
    return undefined;
  }

  const amount = Number(row.wait_amount);
  // The dashboard reads `digest.timed` without a guard on digest steps, so they always carry a digest.
  const digest: DigestMetadataDto = {
    type: (row.wait_type || DigestTypeEnum.REGULAR) as DigestTypeEnum,
    ...(amount > 0 && { amount }),
    ...(row.wait_unit && { unit: row.wait_unit as DigestUnitEnum }),
  };

  if (UNTIL_DATE_WAIT_TYPES.includes(row.wait_type) && row.wait_until && row.wait_until !== CLICKHOUSE_EPOCH) {
    digest.timed = { untilDate: parseClickHouseDateTime(row.wait_until).toISOString() };
  }

  if (row.step_type === StepTypeEnum.DIGEST && events) {
    digest.events = events;
  }

  return digest;
}
