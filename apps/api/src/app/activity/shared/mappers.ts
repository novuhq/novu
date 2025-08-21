import {
  PinoLogger,
  RequestLog,
  StepRun,
  StepRunNonFinalStatus,
  Trace,
  WorkflowRunStatusEnum,
} from '@novu/application-generic';
import { TraceResponseDto } from '../dtos/get-request-traces.response.dto';
import { RequestLogResponseDto } from '../dtos/get-requests.response.dto';
import { WorkflowRunStatusDtoEnum } from '../dtos/shared.dto';

export function mapRequestLogToResponseDto(log: RequestLog): RequestLogResponseDto {
  return {
    id: log.id,
    createdAt: new Date(`${log.created_at} UTC`).toISOString(),
    url: log.url,
    urlPattern: log.url_pattern,
    method: log.method,
    path: log.path,
    statusCode: log.status_code,
    hostname: log.hostname,
    transactionId: log.transaction_id,
    ip: log.ip,
    userAgent: log.user_agent,
    requestBody: log.request_body,
    responseBody: log.response_body,
    userId: log.user_id,
    organizationId: log.organization_id,
    environmentId: log.environment_id,
    authType: log.auth_type,
    durationMs: log.duration_ms,
  };
}

 
export function mapWorkflowRunStatusToDto(
  workflowRunStatus: WorkflowRunStatusEnum,
): WorkflowRunStatusDtoEnum {
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

export function mapTraceToResponseDto(trace: Trace): TraceResponseDto {
  return {
    id: trace.id,
    createdAt: new Date(`${trace.created_at} UTC`).toISOString(),
    eventType: trace.event_type,
    title: trace.title,
    message: trace.message,
    rawData: trace.raw_data,
    status: trace.status,
    entityType: trace.entity_type,
    entityId: trace.entity_id,
    organizationId: trace.organization_id,
    environmentId: trace.environment_id,
    userId: trace.user_id,
    externalSubscriberId: trace.external_subscriber_id,
    subscriberId: trace.subscriber_id,
  };
}
