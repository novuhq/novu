import { StepType, Trace, TraceStatus, WorkflowRunStatusEnum } from '@novu/application-generic';
import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { TraceResponseDto } from '../dtos/get-request.response.dto';
import { RequestLogResponseDto } from '../dtos/get-requests.response.dto';
import { WorkflowRunStatusDtoEnum } from '../dtos/shared.dto';
import { StepExecutionDetailDto } from '../dtos/workflow-run-response.dto';

export function mapRequestLogToResponseDto({
  id,
  createdAt,
  method,
  path,
  statusCode,
  transactionId,
  requestBody,
  responseBody,
}: {
  id: string;
  createdAt: Date;
  method: string;
  path: string;
  statusCode: number;
  transactionId: string;
  requestBody: string;
  responseBody: string;
}): RequestLogResponseDto {
  return {
    id,
    createdAt: new Date(`${createdAt} UTC`).toISOString(),
    method,
    path,
    statusCode,
    transactionId,
    requestBody,
    responseBody,
  };
}

// tmp workaround to map workflow run status to response DTO status, this logic will be overridden by the new status and delivery lifecycle feature.
export function mapWorkflowRunStatusToDto(workflowRunStatus: WorkflowRunStatusEnum, stepRunsType: StepType[]): any {
  // Filter for channel steps (exclude non-channel steps like trigger, delay, digest, custom)
  const channelSteps = stepRunsType.filter((stepType) => ['in_app', 'email', 'sms', 'chat', 'push'].includes(stepType));

  // If no channel steps, determine based on workflow status
  if (channelSteps.length === 0) {
    switch (workflowRunStatus) {
      case WorkflowRunStatusEnum.SUCCESS:
      case 'completed' as WorkflowRunStatusEnum: // legacy
        return WorkflowRunStatusDtoEnum.SUCCESS;
      case WorkflowRunStatusEnum.ERROR:
      case 'failed' as WorkflowRunStatusEnum: // legacy
        return WorkflowRunStatusDtoEnum.ERROR;
      case WorkflowRunStatusEnum.PENDING:
        return WorkflowRunStatusDtoEnum.PENDING;
      default:
        return WorkflowRunStatusDtoEnum.PENDING;
    }
  }
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

export function mapExecutionDetailsToDto(
  traces: Pick<Trace, 'entity_id' | 'id' | 'status' | 'title' | 'raw_data' | 'created_at'>[]
): StepExecutionDetailDto[] {
  return traces.map((trace) => ({
    _id: trace.id,
    createdAt: new Date(`${trace.created_at} UTC`).toISOString(),
    status: mapTraceStatusToExecutionDetailsStatus(trace.status),
    detail: trace.title,
    raw: trace.raw_data,
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
