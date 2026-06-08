import { Injectable, Logger } from '@nestjs/common';
import {
  BulkCreateExecutionDetails,
  InstrumentUsecase,
  LogRepository,
  mapEventTypeToTitle,
  StepRunRepository,
  StepRunTraceInput,
  StepType,
  TraceLogRepository,
} from '@novu/application-generic';
import { DalException, JobEntity, JobRepository, JobStatusEnum } from '@novu/dal';
import { PlatformException } from '../../../shared/utils';
import { AddJob } from '../add-job';
import { StoreSubscriberJobsCommand } from './store-subscriber-jobs.command';

@Injectable()
export class StoreSubscriberJobs {
  constructor(
    private addJob: AddJob,
    private jobRepository: JobRepository,
    protected bulkCreateExecutionDetails: BulkCreateExecutionDetails,
    private stepRunRepository: StepRunRepository,
    private traceLogRepository: TraceLogRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: StoreSubscriberJobsCommand) {
    let storedJobs;
    try {
      storedJobs = await this.jobRepository.storeJobs(command.jobs);
    } catch (e) {
      if (e instanceof DalException) {
        throw new PlatformException(e.message);
      }
      throw e;
    }

    await this.stepRunRepository.createMany(storedJobs, { status: JobStatusEnum.QUEUED });

    await this.emitStepCreatedTraces(storedJobs);

    const firstJob = storedJobs[0];

    const addJobCommand = {
      userId: firstJob._userId,
      environmentId: firstJob._environmentId,
      organizationId: firstJob._organizationId,
      jobId: firstJob._id,
      job: firstJob,
      bridge: firstJob.bridge,
      controlVariables: firstJob.controlVariables,
    };

    await this.addJob.execute(addJobCommand);
  }

  private async emitStepCreatedTraces(storedJobs: JobEntity[]): Promise<void> {
    if (storedJobs.length === 0) {
      return;
    }

    try {
      await this.traceLogRepository.createStepRun(storedJobs.map((job) => this.buildStepCreatedTraceFromJob(job)));
    } catch (error) {
      Logger.error(
        { err: error, jobIds: storedJobs.map((job) => job._id) },
        'Failed to emit step_created traces'
      );
    }
  }

  private buildStepCreatedTraceFromJob(job: JobEntity): StepRunTraceInput {
    return {
      created_at: LogRepository.formatDateTime64(new Date()),
      organization_id: job._organizationId,
      environment_id: job._environmentId,
      user_id: '',
      subscriber_id: job._subscriberId ? job._subscriberId : job.subscriberId,
      external_subscriber_id: job.subscriberId || '',
      event_type: 'step_created',
      title: mapEventTypeToTitle('step_created'),
      message: '',
      raw_data: '',
      status: 'success',
      entity_id: job._id,
      step_run_type: (job.type ?? '') as StepType,
      workflow_run_identifier: job.identifier,
      workflow_id: job._templateId,
      provider_id: job.providerId || '',
    };
  }
}
