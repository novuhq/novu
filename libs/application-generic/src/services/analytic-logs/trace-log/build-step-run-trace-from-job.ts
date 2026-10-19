import { JobEntity } from '@novu/dal';
import { LogRepository } from '../log.repository';
import { StepType } from '../types';
import { EventType, StepRunTraceInput, TraceStatus } from './trace-log.schema';

export type BuildStepRunTraceFromJobParams = {
  event_type: EventType;
  title: string;
  status: TraceStatus;
  message?: string;
  raw_data?: string;
  created_at?: Date;
};

export function buildStepRunTraceFromJob(job: JobEntity, params: BuildStepRunTraceFromJobParams): StepRunTraceInput {
  return {
    created_at: LogRepository.formatDateTime64(params.created_at ?? new Date()),
    organization_id: job._organizationId,
    environment_id: job._environmentId,
    user_id: '',
    subscriber_id: job._subscriberId ?? '',
    external_subscriber_id: job.subscriberId || '',
    event_type: params.event_type,
    title: params.title,
    message: params.message ?? '',
    raw_data: params.raw_data ?? '',
    status: params.status,
    entity_id: job._id,
    step_run_type: (job.type ?? '') as StepType,
    workflow_run_identifier: job.identifier,
    workflow_id: job._templateId,
    provider_id: job.providerId || '',
  };
}
