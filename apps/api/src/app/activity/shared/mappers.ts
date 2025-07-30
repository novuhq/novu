import { RequestLog, WorkflowRunStatusEnum, StepRunNonFinalStatus, StepRun } from '@novu/application-generic';
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

/**
 * Maps workflow run status to response DTO status based on step runs
 * Logic based on channel steps (step runs) as defined in the specification:
 * - Pending: Is not Success, waiting on one or more channel steps
 * - Success: At least one channel step sent
 * - Error: All channel steps failed
 * - Skipped: Intentionally not sent due to user preferences or logic
 * - Cancelled: Explicitly aborted before sending
 * - Merged: Workflow was merged with another and suppressed sending
 */
export function mapWorkflowRunStatusToDto(
  workflowRunStatus: WorkflowRunStatusEnum,
  stepRuns: StepRun[]
): WorkflowRunStatusDtoEnum {
  // Filter for channel steps (exclude non-channel steps like trigger, delay, digest, custom)
  const channelSteps = stepRuns.filter((step) => ['in_app', 'email', 'sms', 'chat', 'push'].includes(step.step_type));

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
      default:
        return WorkflowRunStatusDtoEnum.PENDING;
    }
  }

  // Check for specific statuses first
  if (channelSteps.some((step) => step.status === 'canceled')) {
    return WorkflowRunStatusDtoEnum.CANCELED;
  }

  if (channelSteps.some((step) => step.status === 'merged')) {
    return WorkflowRunStatusDtoEnum.MERGED;
  }

  if (channelSteps.some((step) => step.status === 'skipped')) {
    return WorkflowRunStatusDtoEnum.SKIPPED;
  }

  // Check completion status
  const completedSteps = channelSteps.filter((step) => step.status === 'completed');
  // Success: At least one channel step sent (completed)
  if (completedSteps.length > 0) {
    return WorkflowRunStatusDtoEnum.SUCCESS;
  }

  const failedSteps = channelSteps.filter((step) => step.status === 'failed');
  // Error: All channel steps failed
  if (failedSteps.length === channelSteps.length && channelSteps.length > 0) {
    return WorkflowRunStatusDtoEnum.ERROR;
  }

  // Pending: Default state when waiting on steps
  const nonFinalStatuses: StepRunNonFinalStatus[] = ['pending', 'queued', 'running', 'delayed'];
  const nonFinalStatusSteps = channelSteps.filter((step) =>
    nonFinalStatuses.includes(step.status as StepRunNonFinalStatus)
  );

  if (nonFinalStatusSteps.length === channelSteps.length && channelSteps.length > 0) {
    return WorkflowRunStatusDtoEnum.PENDING;
  }

  this.logger.warn(
    {
      WorkflowRunStatusEnum: workflowRunStatus,
      channelSteps,
    },
    'Unknown workflow run status, fallback to error'
  );

  return WorkflowRunStatusDtoEnum.ERROR;
}
