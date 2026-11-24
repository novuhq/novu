import { Trace, TraceStatus, WorkflowRunStatusEnum } from '@novu/application-generic';
import { DeliveryLifecycleDetail, ExecutionDetailsStatusEnum } from '@novu/shared';
import { TraceResponseDto } from '../dtos/get-request.response.dto';
import { WorkflowRunStatusDtoEnum } from '../dtos/shared.dto';
import { StepExecutionDetailDto } from '../dtos/workflow-run-response.dto';

export function mapWorkflowRunStatusToDto(workflowRunStatus: WorkflowRunStatusEnum): WorkflowRunStatusDtoEnum {
  switch (workflowRunStatus) {
    case WorkflowRunStatusEnum.COMPLETED:
    case WorkflowRunStatusEnum.SUCCESS:
      return WorkflowRunStatusDtoEnum.COMPLETED;
    case WorkflowRunStatusEnum.ERROR:
      return WorkflowRunStatusDtoEnum.ERROR;
    case WorkflowRunStatusEnum.PENDING:
    case WorkflowRunStatusEnum.PROCESSING:
      return WorkflowRunStatusDtoEnum.PROCESSING;
    default:
      return WorkflowRunStatusDtoEnum.PROCESSING;
  }
}

const DELIVERY_LIFECYCLE_DETAILS = new Set<string>(Object.values(DeliveryLifecycleDetail));

/** ClickHouse stores an unset detail as ''; only known values reach the response. */
export function toDeliveryLifecycleDetail(value: string | null | undefined): DeliveryLifecycleDetail | undefined {
  return value && DELIVERY_LIFECYCLE_DETAILS.has(value) ? (value as DeliveryLifecycleDetail) : undefined;
}

export function mapTraceToResponseDto({
  id,
  createdAt,
  eventType,
  title,
  message,
  rawData,
  status,
  entityType,
  entityId,
  organizationId,
  environmentId,
  userId,
  externalSubscriberId,
  subscriberId,
}: {
  id: string;
  createdAt: Date;
  eventType: string;
  title: string;
  message: string;
  rawData: string;
  status: string;
  entityType: string;
  entityId: string;
  organizationId: string;
  environmentId: string;
  userId: string;
  externalSubscriberId: string;
  subscriberId: string;
}): TraceResponseDto {
  return {
    id,
    createdAt: new Date(`${createdAt} UTC`).toISOString(),
    eventType,
    title,
    message,
    rawData,
    status,
    entityType,
    entityId,
    organizationId,
    environmentId,
    userId,
    externalSubscriberId,
    subscriberId,
  };
}

export function mapTraceToExecutionDetailDto(
  traces: Pick<Trace, 'entity_id' | 'id' | 'status' | 'title' | 'raw_data' | 'created_at' | 'event_type'>[],
  includeRaw: boolean
): StepExecutionDetailDto[] {
  return traces.map((trace) => ({
    _id: trace.id,
    createdAt: new Date(`${trace.created_at} UTC`).toISOString(),
    status: mapTraceStatusToExecutionDetailsStatus(trace.status),
    detail: trace.title,
    raw: includeRaw ? trace.raw_data : undefined,
    eventType: trace.event_type,
  }));
}

function mapTraceStatusToExecutionDetailsStatus(traceStatus: TraceStatus): ExecutionDetailsStatusEnum {
  switch (traceStatus) {
    case 'success':
      return ExecutionDetailsStatusEnum.SUCCESS;
    case 'error':
      return ExecutionDetailsStatusEnum.FAILED;
    case 'warning':
      return ExecutionDetailsStatusEnum.WARNING;
    case 'pending':
      return ExecutionDetailsStatusEnum.PENDING;
    default:
      return ExecutionDetailsStatusEnum.FAILED;
  }
}
